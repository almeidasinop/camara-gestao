package main

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuditLog registra ações críticas no sistema
type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `json:"user_id"`
	User      User      `json:"user,omitempty"` // Preload
	Action    string    `json:"action"`         // CREATE, UPDATE, DELETE, LOGIN
	Entity    string    `json:"entity"`         // Ticket, User, Asset, Setting
	EntityID  uint      `json:"entity_id"`
	Details   string    `json:"details"` // Detalhes da mudança
}

// Helper para registrar log
func logAction(userID uint, action, entity string, entityID uint, details string) {
	// Rodar em goroutine para não bloquear a request principal
	go func() {
		db.Create(&AuditLog{
			UserID:   userID,
			Action:   action,
			Entity:   entity,
			EntityID: entityID,
			Details:  details,
		})
	}()
}

// ==========================================
// 8. ROTINA DE BACKUP AUTOMÁTICA
// ==========================================

func startBackupScheduler() {
	// Criar diretório de backup se não existir
	backupDir := os.Getenv("BACKUP_DIR")
	if backupDir == "" {
		backupDir = "backups"
	}

	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		os.MkdirAll(backupDir, 0755)
	}

	// Rodar imediatamente ao iniciar (para segurança) e depois em loop
	fmt.Println("[Backup] Iniciando serviço de backup automático...")
	performBackup(backupDir)

	ticker := time.NewTicker(6 * time.Hour) // Verifica a cada 6h (pode ser ajustado)
	defer ticker.Stop()

	for range ticker.C {
		performBackup(backupDir)
		cleanupOldBackups(backupDir)
	}
}

func performBackup(dir string) {
	filename := fmt.Sprintf("backup_auto_%s.db", time.Now().Format("20060102_150405"))
	filepath := filepath.Join(dir, filename)

	fmt.Printf("[Backup] Gerando backup: %s ...\n", filename)

	// VACUUM INTO é a maneira thread-safe de fazer backup do SQLite rodando
	// Requer SQLite >= 3.27
	err := db.Exec(fmt.Sprintf("VACUUM INTO '%s'", filepath)).Error
	if err != nil {
		fmt.Printf("[Backup] ERRO: %v\n", err)
	} else {
		fmt.Println("[Backup] Sucesso!")
	}
}

func cleanupOldBackups(dir string) {
	// Manter apenas ultimos 7 arquivos
	files, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	if len(files) > 10 {
		// Simples: deletar os mais antigos se tiver mais de 10
		// A ordenação padrão de ReadDir e o nome YYYYMMDD garantem ordem cronologica crescente (antigos primeiro)
		for i := 0; i < len(files)-10; i++ {
			f := files[i]
			fullPath := filepath.Join(dir, f.Name())
			os.Remove(fullPath)
			fmt.Printf("[Backup] Limpeza: Removido %s\n", f.Name())
		}
	}
}

// ==========================================
// 1. MODELOS DE DADOS (Structs)
// ==========================================

// ServiceCategory representa um tipo de serviço (ex: Redes, Hardware)
type ServiceCategory struct {
	ID               uint   `gorm:"primaryKey" json:"id"`
	Name             string `gorm:"unique;not null" json:"name"`
	DefaultUserID    uint   `json:"default_user_id"`
	DefaultUser      *User  `json:"default_user,omitempty" gorm:"foreignKey:DefaultUserID"`
	EscalationUserID *uint  `json:"escalation_user_id"`
	EscalationUser   *User  `json:"escalation_user,omitempty" gorm:"foreignKey:EscalationUserID"`
	SLATimeout       int    `json:"sla_timeout" gorm:"default:4"` // Horas para escalonar
}

// User representa um usuário do sistema
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"`          // Ocultar senha no JSON
	Role      string    `gorm:"default:'Tech'" json:"role"` // Admin, Tech
	FullName  string    `json:"full_name"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Asset representa um equipamento no inventário
type Asset struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Seção A: Identificação
	Hostname     string `gorm:"uniqueIndex" json:"hostname" binding:"required"`
	AssetTag     string `json:"asset_tag"`                               // Nº Inventário / Patrimônio
	SerialNumber string `json:"serial_number"`                           // Serial Number
	Type         string `gorm:"not null" json:"type" binding:"required"` // PC, Monitor, Impressora
	Status       string `gorm:"default:'Em Uso'" json:"status"`          // Em Uso, Estoque, Manutenção
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`

	// Seção B: Localização e Responsabilidade
	Location       string `json:"location"`        // Ex: Matriz > Sala TI
	Responsible    string `json:"responsible"`     // Quem usa?
	TechnicalGroup string `json:"technical_group"` // Ex: N1, Infra

	// Seção C: Detalhes Técnicos (Computador)
	OS        string `json:"os"`        // Windows 11
	Processor string `json:"processor"` // i7-10700
	RAM       string `json:"ram"`       // 16GB
	Storage   string `json:"storage"`   // SSD 512GB
	IPAddress string `json:"ip_address"`

	// Seção C: Detalhes Técnicos (Monitor/Outros)
	ScreenSize  string `json:"screen_size"` // 24"
	Connections string `json:"connections"` // HDMI, DP

	// Seção D: Financeiro
	PurchaseDate  time.Time `json:"purchase_date"`
	WarrantyEnd   time.Time `json:"warranty_end"`
	Price         float64   `json:"price"`
	InvoiceNumber string    `json:"invoice_number"`
	Supplier      string    `json:"supplier"`
}

// Ticket representa um pedido de suporte ou incidente
type Ticket struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	Status      string    `gorm:"default:'Novo'" json:"status"` // Novo, Em Andamento, Resolvido
	Priority    string    `json:"priority"`                     // Baixa, Media, Alta
	DueDate     time.Time `json:"due_date"`                     // SLA

	// Relacionamento: Um Ticket pertence a um Ativo (opcional)
	AssetID *uint  `json:"asset_id"`
	Asset   *Asset `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"asset,omitempty"`

	// Relacionamento: Ticket criado por um Usuário
	CreatorID uint  `json:"creator_id"`
	Creator   *User `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"creator,omitempty"`

	// Novos campos solicitados
	Sector    string `json:"sector"`    // Setor do solicitante
	Patrimony string `json:"patrimony"` // Códigos de patrimônio informados

	// Classificação e Atribuição
	CategoryID   *uint            `json:"category_id"`
	Category     *ServiceCategory `json:"category,omitempty"`
	AssignedToID *uint            `json:"assigned_to_id"`
	AssignedTo   *User            `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"assigned_to,omitempty"`

	// Relacionamento: Um Ticket tem muitos Comentários
	Comments []Comment `json:"comments"`
}

// BeforeCreate hook for Ticket (SLA Calculation)
func (t *Ticket) BeforeCreate(tx *gorm.DB) (err error) {
	// Definição de SLA simples
	hoursToAdd := 24 // Default (Media)
	switch t.Priority {
	case "Alta":
		hoursToAdd = 8
	case "Baixa":
		hoursToAdd = 48
	}
	t.DueDate = time.Now().Add(time.Duration(hoursToAdd) * time.Hour)

	// Lógica de Atribuição Automática baseada na Categoria
	if t.CategoryID != nil && *t.CategoryID > 0 && (t.AssignedToID == nil || *t.AssignedToID == 0) {
		var category ServiceCategory
		if err := tx.First(&category, *t.CategoryID).Error; err == nil {
			t.AssignedToID = &category.DefaultUserID
		}
	}

	return nil
}

// Comment representa uma interação ou atualização em um ticket
type Comment struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	TicketID uint   `json:"ticket_id"`
	Content  string `gorm:"not null" json:"content" binding:"required"`
	Author   string `json:"author"` // Por enquanto, string simples (ex: "Tecnico")
}

// AssetHistory registra alterações nos ativos
type AssetHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	AssetID   uint      `json:"asset_id"`
	Event     string    `json:"event"`   // Ex: "Criado", "Atualizado"
	Details   string    `json:"details"` // Descrição do que mudou
	User      string    `json:"user"`    // Quem mudou (futuramente ID do usuario)
}

// --- GORM HOOKS ---

// AfterCreate logic for Asset
func (a *Asset) AfterCreate(tx *gorm.DB) (err error) {
	history := AssetHistory{
		AssetID: a.ID,
		Event:   "Criação",
		Details: "Ativo criado no sistema",
		User:    "Sistema",
	}
	return tx.Create(&history).Error
}

// BeforeUpdate logic for Asset
func (a *Asset) BeforeUpdate(tx *gorm.DB) (err error) {
	if !a.DeletedAt.Time.IsZero() {
		return nil
	}
	history := AssetHistory{
		AssetID: a.ID,
		Event:   "Atualização",
		Details: "Ativo atualizado (Hostname/Status/IP)",
		User:    "Sistema",
	}
	tx.Create(&history)
	return nil
}

// Variável global para o banco de dados
var db *gorm.DB
var jwtSecret = []byte("super_secret_key_change_me_in_prod")

// SystemSetting define configurações globais de permissão
type SystemSetting struct {
	Key         string `gorm:"primaryKey" json:"key"` // ex: "user_view_reports"
	Value       string `json:"value"`                 // ex: "true", "false"
	Description string `json:"description"`
}

// Inicializa configurações padrão se não existirem
func seedSettings() {
	defaults := []SystemSetting{
		{Key: "user_view_reports", Value: "false", Description: "Permitir que usuários comuns visualizem relatórios"},
		{Key: "tech_delete_assets", Value: "false", Description: "Permitir que técnicos excluam ativos"},
		{Key: "tech_delete_tickets", Value: "false", Description: "Permitir que técnicos excluam chamados"},
		// Configurações LDAP
		{Key: "ldap_enabled", Value: "false", Description: "Habilitar autenticação AD/LDAP (true/false)"},
		{Key: "ldap_host", Value: "192.168.1.5", Description: "IP ou Hostname do servidor LDAP"},
		{Key: "ldap_port", Value: "389", Description: "Porta do LDAP (padrão 389 ou 636 para SSL)"},
		{Key: "ldap_basedn", Value: "dc=camara,dc=local", Description: "Base DN para busca de usuários"},
		{Key: "ldap_domain", Value: "CAMARA", Description: "Domínio (NetBIOS) para login (ex: CAMARA\\user)"},
	}
	for _, s := range defaults {
		var existing SystemSetting
		if err := db.First(&existing, "key = ?", s.Key).Error; err != nil {
			db.Create(&s)
		}
	}
}

// ==========================================
// 2. CONFIGURAÇÃO E INICIALIZAÇÃO
// ==========================================

func initDB() {
	var err error
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "glpi_clone.db"
	}

	// Configurar conexão com WAL e Busy Timeout para evitar locks
	// Docs: https://github.com/mattn/go-sqlite3#connection-string
	dsn := fmt.Sprintf("%s?_journal_mode=WAL&_busy_timeout=5000", dbPath)
	db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("Falha ao conectar ao banco de dados: " + err.Error())
	}

	// AutoMigrate
	err = db.AutoMigrate(&User{}, &Asset{}, &Ticket{}, &Comment{}, &AssetHistory{}, &ServiceCategory{}, &SystemSetting{}, &AuditLog{})
	if err != nil {
		panic("Falha na migração do banco de dados")
	}

	seedDatabase()
	seedSettings()

	// Iniciar agendador de backups
	go startBackupScheduler()
}

func seedDatabase() {
	fmt.Println("[SEED] Iniciando seed do banco de dados...")

	// 1. Criar Usuário Admin
	var count int64
	db.Model(&User{}).Count(&count)
	fmt.Printf("[SEED] Total de usuários encontrados: %d\n", count)

	if count == 0 {
		fmt.Println("[SEED] Criando usuário admin padrão...")
		createSeedUser("admin", "Admin", "Administrador")
	} else {
		fmt.Println("[SEED] Usuários já existem, pulando criação do admin")
	}

	// 2. Criar Técnicos Específicos (Mauro, André, Carlos)
	fmt.Println("[SEED] Criando técnicos padrão...")
	mauro := createSeedUser("mauro", "Tech", "Mauro (Redes)")
	andre := createSeedUser("andre", "Tech", "André (Hardware)")
	carlos := createSeedUser("carlos", "Tech", "Carlos (Softwares)")

	// 3. Criar Categorias de Serviço Iniciais
	fmt.Println("[SEED] Criando categorias de serviço...")
	seedCategory("Redes e Telefonia", mauro.ID)
	seedCategory("Informática e Impressoras", andre.ID)
	seedCategory("Softwares e Sistemas", carlos.ID)
	seedCategory("Patrimônio e Mobiliário", mauro.ID)

	fmt.Println("[SEED] Seed concluído com sucesso!")
}

func createSeedUser(username, role, fullName string) User {
	fmt.Printf("[SEED] Tentando criar usuário: %s (role: %s)\n", username, role)
	var user User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		fmt.Printf("[SEED] Usuário %s não existe, criando...\n", username)
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		user = User{
			Username: username,
			Password: string(hashedPassword),
			Role:     role,
			FullName: fullName,
		}
		if err := db.Create(&user).Error; err != nil {
			fmt.Printf("[SEED] ERRO ao criar usuário %s: %v\n", username, err)
		} else {
			fmt.Printf("[SEED] ✓ Usuário criado: %s (ID: %d)\n", username, user.ID)
		}
	} else {
		fmt.Printf("[SEED] Usuário %s já existe (ID: %d), pulando...\n", username, user.ID)
	}
	return user
}

func seedCategory(name string, defaultUserID uint) {
	var cat ServiceCategory
	if err := db.Where("name = ?", name).First(&cat).Error; err != nil {
		cat = ServiceCategory{Name: name, DefaultUserID: defaultUserID}
		db.Create(&cat)
		fmt.Printf("Categoria criada: %s -> User ID %d\n", name, defaultUserID)
	}
}

// ==========================================
// 3. HANDLERS (Controladores da API)
// ==========================================

// Login Handler
func Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Tentar Login Local
	var user User
	if err := db.Where("username = ?", input.Username).First(&user).Error; err == nil {
		// Usuário encontrado localmente
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err == nil {
			// Senha correta -> Gerar Token
			generateTokenAndRespond(c, user)
			return
		}
	}

	// 2. Se falhar local e LDAP estiver ativo, tentar LDAP
	var ldapEnabled SystemSetting
	db.First(&ldapEnabled, "key = ?", "ldap_enabled")

	if ldapEnabled.Value == "true" {
		ldapUser, err := authenticateLDAP(input.Username, input.Password)
		if err == nil {
			// Sucesso no LDAP! Sincronizar usuário local (JIT)

			// Verificar se já existe (pode não ter achado antes por diferença de case ou senha local antiga)
			var localUser User
			if err := db.Where("username = ?", input.Username).First(&localUser).Error; err != nil {
				// Cria novo usuário
				localUser = User{
					Username: input.Username,
					FullName: ldapUser.FullName, // Assumindo que authenticateLDAP retorna isso
					Role:     "User",            // Padrão
					Password: "LDAP_MANAGED",    // Placeholder
				}
				db.Create(&localUser)
			} else {
				// Atualiza dados
				localUser.FullName = ldapUser.FullName
				db.Save(&localUser)
			}

			generateTokenAndRespond(c, localUser)
			return
		} else {
			// fmt.Println("Erro LDAP:", err)
		}
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
}

func generateTokenAndRespond(c *gin.Context, user User) {
	// Gerar JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userID":   user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 8).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user":  user,
	})
}

// Stub para autenticação LDAP (precisa da lib go-ldap)
// Retorna um struct temporário com dados do user
type LDAPUser struct {
	Username string
	FullName string
}

func authenticateLDAP(username, password string) (*LDAPUser, error) {
	// Carregar configurações
	var host, port, domain SystemSetting
	db.First(&host, "key = ?", "ldap_host")
	db.First(&port, "key = ?", "ldap_port")
	db.First(&domain, "key = ?", "ldap_domain")

	// Por enquanto, como não temos a lib importada no main e pode dar erro de build se a net estiver ruim,
	// vamos fazer um mock se a senha for "ldap123" para testar o fluxo.
	// Na implementação real, usaríamos "github.com/go-ldap/ldap/v3"

	// MOCK IMPLEMENTATION FOR SAFETY (até instalar a lib)
	/*
	   conn, err := ldap.DialURL(fmt.Sprintf("ldap://%s:%s", host.Value, port.Value))
	   if err != nil { return nil, err }
	   defer conn.Close()

	   // Bind Simples (Login direto com user@domain ou domain\user)
	   userPrincipal := fmt.Sprintf("%s\\%s", domain.Value, username) // ou username@domain.com

	   if err := conn.Bind(userPrincipal, password); err != nil {
	       return nil, err
	   }

	   // Se bind funcionou,Login OK.
	   // Pesquisar para pegar FullName
	   // ...
	*/

	// Simulando erro por enquanto pois a lib pode não estar lá
	return nil, fmt.Errorf("LDAP não configurado/instalado")
}

// Check Role Middleware
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Permissão negada"})
			return
		}

		userRole := role.(string)
		for _, r := range allowedRoles {
			if r == userRole {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Acesso restrito a " + fmt.Sprint(allowedRoles)})
	}
}

// Auth Middleware
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token não fornecido"})
			return
		}

		// Remove "Bearer " prefix if present
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if ok && token.Valid {
			// Set user context
			c.Set("userID", claims["sub"])
			c.Set("role", claims["role"])
		}

		c.Next()
	}
}

// --- ASSET HANDLERS ---

func GetAssets(c *gin.Context) {
	var assets []Asset
	if err := db.Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assets)
}

func CreateAsset(c *gin.Context) {
	var input Asset
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if result := db.Create(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func UpdateAsset(c *gin.Context) {
	var asset Asset
	id := c.Param("id")

	if err := db.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	var input Asset
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Campos permitidos para atualização
	asset.Hostname = input.Hostname
	asset.Type = input.Type
	asset.IPAddress = input.IPAddress
	asset.Status = input.Status
	asset.Manufacturer = input.Manufacturer
	asset.Model = input.Model

	db.Save(&asset)
	c.JSON(http.StatusOK, asset)
}

func DeleteAsset(c *gin.Context) {
	var asset Asset
	id := c.Param("id")

	if err := db.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	db.Delete(&asset)
	c.JSON(http.StatusOK, gin.H{"message": "Ativo removido com sucesso"})
}

func GetAssetHistory(c *gin.Context) {
	var history []AssetHistory
	id := c.Param("id")

	if err := db.Where("asset_id = ?", id).Order("created_at desc").Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar histórico"})
		return
	}
	c.JSON(http.StatusOK, history)
}

// --- TICKET HANDLERS ---

func GetTickets(c *gin.Context) {
	var tickets []Ticket
	role, _ := c.Get("role")
	userID, _ := c.Get("userID")

	query := db.Preload("Asset").Preload("Comments").Preload("Creator")

	// Se for usuário comum, filtrar apenas os seus tickets
	if role == "User" {
		query = query.Where("creator_id = ?", userID)
	}

	// Se for técnico, ver tickets atribuídos a ele OU tickets sem atribuição (para pegar)
	// Também vê tickets onde ele é o criador (caso ele mesmo abra um chamado)
	if role == "Tech" {
		// Converter userID para uint de forma segura (depende de como saved no JWT context, assumindo float64 do mapclaims)
		uid := uint(userID.(float64))
		query = query.Where("assigned_to_id = ? OR assigned_to_id IS NULL OR creator_id = ?", uid, uid)
	}

	if err := query.Order("created_at desc").Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tickets)
}

func GetSettings(c *gin.Context) {
	var settings []SystemSetting
	db.Find(&settings)
	c.JSON(http.StatusOK, settings)
}

func UpdateSetting(c *gin.Context) {
	var input SystemSetting
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Apenas atualiza o valor, key é fixa
	var setting SystemSetting
	if err := db.First(&setting, "key = ?", c.Param("key")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuração não encontrada"})
		return
	}
	setting.Value = input.Value
	db.Save(&setting)
	c.JSON(http.StatusOK, setting)
}

func GetCategories(c *gin.Context) {
	var categories []ServiceCategory
	if err := db.Preload("DefaultUser").Preload("EscalationUser").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func CreateCategory(c *gin.Context) {
	var input ServiceCategory
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar categoria"})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func UpdateCategory(c *gin.Context) {
	var category ServiceCategory
	if err := db.First(&category, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Categoria não encontrada"})
		return
	}
	var input ServiceCategory
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category.Name = input.Name
	category.DefaultUserID = input.DefaultUserID
	category.EscalationUserID = input.EscalationUserID
	category.SLATimeout = input.SLATimeout

	db.Save(&category)
	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	if err := db.Delete(&ServiceCategory{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao deletar categoria"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Categoria removida"})
}

func CreateTicket(c *gin.Context) {
	// Estrutura auxiliar para receber o JSON
	var input struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description" binding:"required"`
		Priority    string `json:"priority"`
		TicketType  string `json:"ticket_type"`
		AssetID     *uint  `json:"asset_id"` // Opcional
		CategoryID  *uint  `json:"category_id"`
		RequesterID *uint  `json:"requester_id"` // Novo campo: se Tech abrir para User
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ticket := Ticket{
		Title:       input.Title,
		Description: input.Description,
		Priority:    input.Priority,
		// TicketType removido pois nao existe na struct
		AssetID:    input.AssetID,
		CategoryID: input.CategoryID,
		Status:     "Novo", // Sempre Novo
	}

	currentUserID := uint(0)
	userRole := ""
	if userID, exists := c.Get("userID"); exists {
		currentUserID = uint(userID.(float64))
	}
	if role, exists := c.Get("role"); exists {
		userRole = role.(string)
	}

	// Lógica para definir CreatorID
	if userRole != "User" && input.RequesterID != nil && *input.RequesterID > 0 {
		// Se for Tech/Admin e mandou RequesterID, usa ele
		ticket.CreatorID = *input.RequesterID
	} else {
		// Senão, o criador é quem está logado
		ticket.CreatorID = currentUserID
	}

	// Tentativa automática de atribuição (se categoria tiver default e não for o proprio criador técnico criando pra ele mesmo?)
	// Se for Tech criando, talvez ele queira ja pegar?
	// Por enquanto mantemos a lógica da categoria (Auto Assign)
	var cat ServiceCategory
	if ticket.CategoryID != nil {
		if err := db.First(&cat, *ticket.CategoryID).Error; err == nil && cat.DefaultUserID > 0 {
			ticket.AssignedToID = &cat.DefaultUserID
		}
	}

	if result := db.Create(&ticket); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	db.Preload("Asset").Preload("Creator").Preload("Category").Preload("AssignedTo").First(&ticket, ticket.ID)

	// Audit
	details := fmt.Sprintf("Título: %s | Prio: %s", ticket.Title, ticket.Priority)
	if ticket.CreatorID != currentUserID {
		details += fmt.Sprintf(" | Aberto para ID: %d", ticket.CreatorID)
	}
	logAction(currentUserID, "CREATE", "Ticket", ticket.ID, details)

	c.JSON(http.StatusCreated, ticket)
}

func GetTicketByID(c *gin.Context) {
	var ticket Ticket
	if err := db.Preload("Asset").Preload("Comments").Preload("Category").Preload("AssignedTo").First(&ticket, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

func UpdateTicketStatus(c *gin.Context) {
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var ticket Ticket
	if err := db.First(&ticket, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	// Verificar permissões
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	uid := uint(userID.(float64))

	// Tech e Admin podem tudo
	// User só pode alterar status se for o criador E (geralmente Reabrir ou Cancelar, mas vamos deixar ele reabrir)
	if role == "User" {
		if ticket.CreatorID != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Você não tem permissão para alterar este chamado"})
			return
		}
		// Se quiser restringir quais status o User pode setar (ex: apenas "Novo" - reabrir)
		// if input.Status != "Novo" && input.Status != "Cancelado" { ... }
	}

	ticket.Status = input.Status
	db.Save(&ticket)

	logAction(uid, "UPDATE", "Ticket", ticket.ID, fmt.Sprintf("Status alterado para %s", ticket.Status))

	c.JSON(http.StatusOK, ticket)
}

func AddComment(c *gin.Context) {
	var input Comment
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Link to ticket from URL param
	input.TicketID = 0 // will be ignored if using struct binding usually, but let's be safe
	// In Gin, we can't easily bind param to json struct field automatically in one go without logic
	// But let's assume the user sends content and author in JSON.

	// We need to set TicketID from param
	// Using GORM association is better or just setting ID
	var ticket Ticket
	if err := db.First(&ticket, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}
	input.TicketID = ticket.ID
	db.Create(&input)
	c.JSON(http.StatusCreated, input)
}

// --- USER HANDLERS ---

func GetUsers(c *gin.Context) {
	var users []User
	// Retornar apenas campos seguros, ou toda struct (senha vai junto mas hasheada... ideal é DTO)
	if err := db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

// Retorna lista simplificada para combobox (ID, FullName/Username) - Acessível para Tech
func GetUsersSimple(c *gin.Context) {
	type UserSimple struct {
		ID       uint   `json:"id"`
		FullName string `json:"full_name"`
		Username string `json:"username"`
	}
	var users []User
	var result []UserSimple

	if err := db.Select("id, full_name, username").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, u := range users {
		name := u.FullName
		if name == "" {
			name = u.Username
		}
		result = append(result, UserSimple{ID: u.ID, FullName: name, Username: u.Username})
	}
	c.JSON(http.StatusOK, result)
}

func GetUserByID(c *gin.Context) {
	var user User
	if err := db.First(&user, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func CreateUser(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar senha"})
		return
	}

	user := User{
		Username: input.Username,
		Password: string(hashedPassword),
		Role:     input.Role,
	}

	if result := db.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func UpdateUser(c *gin.Context) {
	var user User
	if err := db.First(&user, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}

	var input struct {
		Role     string `json:"role"`
		Password string `json:"password"` // Opcional
		FullName string `json:"full_name"`
		Avatar   string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Permitir se for Admin OU se for o próprio usuário
	currentUserID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// Converte user.ID (uint) para comparar
	isSelf := fmt.Sprintf("%v", user.ID) == fmt.Sprintf("%v", currentUserID)
	isAdmin := role == "Admin"

	if !isAdmin && !isSelf {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para editar este usuário"})
		return
	}

	// Apenas Admin pode mudar Role
	if input.Role != "" && isAdmin {
		user.Role = input.Role
	}

	if input.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		user.Password = string(hashedPassword)
	}

	if input.FullName != "" {
		user.FullName = input.FullName
	}

	if input.Avatar != "" {
		user.Avatar = input.Avatar
	}

	db.Save(&user)
	c.JSON(http.StatusOK, user)
}

func DeleteUser(c *gin.Context) {
	var user User
	if err := db.First(&user, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}
	// Evitar deletar a si mesmo ou o último admin seria ideal, mas por simplicidade:
	if user.Username == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não é permitido deletar o usuário admin principal"})
		return
	}

	db.Delete(&user)
	c.JSON(http.StatusOK, gin.H{"message": "Usuário removido"})
}

// ==========================================
// 4. MAIN FUNCTION (Ponto de Entrada)
// ==========================================

func main() {
	// "Go Horse" Mode: Produção Hardcoded
	gin.SetMode(gin.ReleaseMode)

	// Inicializa o banco de dados
	initDB()

	// Inicia Job de SLA em background
	go runSLAMonitor()

	// Configura o roteador Gin
	r := gin.Default()

	// Configurar CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Grupo de rotas da API
	api := r.Group("/api/v1")
	{
		// Rotas Públicas
		api.POST("/login", Login)
		api.GET("/debug/users", DebugUsers)        // Diagnóstico: listar usuários
		api.POST("/setup/init", SetupInitialAdmin) // Setup: criar admin inicial

		// (Handlers movidos para o final do arquivo)
		// Rotas Protegidas
		// Note: Para facilitar os testes do usuário sem login no frontend ainda,
		// vou deixar as rotas abertas por enquanto e proteger apenas se ele pedir,
		// OU manter o AuthMiddleware mas permitir que o frontend lide com o erro 401.
		// O requisito é "sistema de login". Se eu proteger agora, o frontend atual (sem login) vai quebrar (401).
		// Vou proteger, e o próximo passo é implementar o login no front.

		secure := api.Group("/")
		secure.Use(AuthMiddleware())
		{
			// Assets
			secure.GET("/assets", GetAssets)
			secure.GET("/assets/:id/history", GetAssetHistory)

			// Rotas de Ativos Protegidas (Apenas Admin e Tech)
			assetsGroup := secure.Group("/")
			assetsGroup.Use(RoleMiddleware("Admin", "Tech"))
			{
				assetsGroup.POST("/assets", CreateAsset)
				assetsGroup.PUT("/assets/:id", UpdateAsset)
				assetsGroup.DELETE("/assets/:id", DeleteAsset)
				assetsGroup.POST("/import/assets", ImportAssets)
				assetsGroup.POST("/import/users", ImportUsers)
				assetsGroup.POST("/users", CreateUser)
				assetsGroup.DELETE("/users/:id", DeleteUser)
			}

			// Tickets
			secure.GET("/tickets", GetTickets)
			secure.POST("/tickets", CreateTicket)
			secure.GET("/tickets/:id", GetTicketByID)
			secure.PATCH("/tickets/:id/status", UpdateTicketStatus)
			secure.POST("/tickets/:id/comments", AddComment)

			// Reports
			secure.GET("/reports", GetReports)

			// Audit (Admin only)
			secure.GET("/audit", RoleMiddleware("Admin"), GetAuditLogs)

			// Dashboard KPIs (Tech/Admin)
			secure.GET("/dashboard/kpis", RoleMiddleware("Tech", "Admin"), GetDashboardStats)

			// Users
			// Users Routes
			userGroup := secure.Group("/users")

			// Rotas Específicas (Static)
			// GET /users/techs (Public or Auth?) - Auth only (secure group)
			userGroup.GET("/techs", GetTechs)

			// GET /users/list (Tech/Admin)
			userGroup.GET("/list", RoleMiddleware("Tech", "Admin"), GetUsersSimple)

			// Rotas Parametrizadas (Dynamic)
			userGroup.GET("/:id", GetUserByID)
			userGroup.PUT("/:id", UpdateUser) // Validação interna de permissão

			// Rotas Raiz (Root)
			// GET /users/ (Admin only)
			userGroup.GET("/", RoleMiddleware("Admin"), GetUsers)
			// POST /users/ (Admin only)
			userGroup.POST("/", RoleMiddleware("Admin"), CreateUser)

			// Categories Management (Admin only)
			secure.GET("/categories", GetCategories)
			catGroup := secure.Group("/categories")
			catGroup.Use(RoleMiddleware("Admin"))
			{
				catGroup.POST("/", CreateCategory)
				catGroup.PUT("/:id", UpdateCategory)
				catGroup.DELETE("/:id", DeleteCategory)
			}

			// System Update Trigger
			secure.POST("/system/update", RoleMiddleware("Admin"), TriggerUpdate)

			// System Settings
			secure.GET("/settings", GetSettings)
			secure.PUT("/settings/:key", RoleMiddleware("Admin"), UpdateSetting)
		}
	}

	// ==========================================
	// 5. SERVIR FRONTEND (SPA)
	// ==========================================
	// Serve arquivos estáticos da pasta build do React
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/vite.svg", "./frontend/dist/vite.svg")
	r.StaticFile("/favicon.ico", "./frontend/dist/favicon.ico")

	// Para qualquer outra rota não-API, serve o index.html (SPA)
	r.NoRoute(func(c *gin.Context) {
		// Se não for rota de API, serve o index.html
		if c.Request.URL.Path != "/" && len(c.Request.URL.Path) > 4 && c.Request.URL.Path[:5] == "/api/" {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}
		c.File("./frontend/dist/index.html")
	})

	// Porta do servidor (padrão 8080)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Servidor rodando na porta " + port)

	// Recuperar pânico em caso de erro fatal
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Erro fatal recuperado:", r)
		}
	}()

	r.Run(":" + port)
}

// --- AUDIT HANDLERS ---

func GetAuditLogs(c *gin.Context) {
	var logs []AuditLog
	query := db.Preload("User").Order("created_at desc").Limit(100)

	if entity := c.Query("entity"); entity != "" {
		query = query.Where("entity = ?", entity)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}

	if err := query.Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar logs"})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// --- DASHBOARD HANDLERS ---

func GetDashboardStats(c *gin.Context) {
	var stats struct {
		OpenCount     int64 `json:"open"`
		CriticalCount int64 `json:"critical"`
		TodayCount    int64 `json:"today"`
		SLABreach     int64 `json:"sla_breach"`
	}

	// 1. Abertos (Status != Resolvido, Fechado)
	db.Model(&Ticket{}).Where("status NOT IN ?", []string{"Resolvido", "Fechado"}).Count(&stats.OpenCount)

	// 2. Críticos (Priority = Alta AND Status != Resolvido/Fechado)
	db.Model(&Ticket{}).Where("priority = ? AND status NOT IN ?", "Alta", []string{"Resolvido", "Fechado"}).Count(&stats.CriticalCount)

	// 3. Abertos Hoje
	db.Model(&Ticket{}).Where("created_at >= ?", time.Now().Format("2006-01-02 00:00:00")).Count(&stats.TodayCount)

	// 4. SLA Violado (Calculado via SQL para precisão)
	// Lógica: Se status aberto E now > (created_at + timeout).
	// Como o timeout é dinâmico por categoria, isso é complexo em SQL puro simples.
	// Vamos usar a aproximação de 4h padrão ou iterar se não for absurdo.
	// Melhor: Query tickets abertos e checar Go-side para precisão máxima com a lógica do checkSLA

	var openTickets []Ticket
	db.Preload("Category").Where("status NOT IN ?", []string{"Resolvido", "Fechado"}).Find(&openTickets)

	breachCount := 0
	now := time.Now()
	for _, t := range openTickets {
		timeout := 4 // default
		if t.Category != nil && t.Category.SLATimeout > 0 {
			timeout = t.Category.SLATimeout
		}
		deadline := t.CreatedAt.Add(time.Duration(timeout) * time.Hour)
		if now.After(deadline) {
			breachCount++
		}
	}
	stats.SLABreach = int64(breachCount)

	// Buscar lista de críticos recentes para a lista
	var criticalList []Ticket
	db.Preload("Category").Preload("Creator").Preload("AssignedTo").
		Where("status NOT IN ?", []string{"Resolvido", "Fechado"}).
		Order("CASE WHEN priority = 'Alta' THEN 1 ELSE 2 END, created_at ASC").
		Limit(10).
		Find(&criticalList)

	c.JSON(http.StatusOK, gin.H{
		"stats":            stats,
		"critical_tickets": criticalList,
	})
}

// --- IMPORT HANDLERS ---

func ImportAssets(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Arquivo não enviado"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao abrir arquivo"})
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao ler CSV"})
		return
	}

	successCount := 0
	errorCount := 0

	// Ignorar header se existir (assumindo que tem header)
	if len(records) > 0 {
		records = records[1:]
	}

	for _, record := range records {
		// Esperado: Hostname, Type, Serial, AssetTag, Location, Status
		if len(record) < 6 {
			errorCount++
			continue
		}

		asset := Asset{
			Hostname:     record[0],
			Type:         record[1],
			SerialNumber: record[2],
			AssetTag:     record[3],
			Location:     record[4],
			Status:       record[5],
		}

		// Default values if empty
		if asset.Status == "" {
			asset.Status = "Em Uso"
		}
		if asset.Type == "" {
			asset.Type = "Computador"
		}

		if err := db.Create(&asset).Error; err != nil {
			errorCount++
		} else {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Importação concluída",
		"success": successCount,
		"errors":  errorCount,
	})
}

func ImportUsers(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Arquivo não enviado"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao abrir arquivo"})
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao ler CSV"})
		return
	}

	successCount := 0
	errorCount := 0

	if len(records) > 0 {
		records = records[1:]
	}

	for _, record := range records {
		// Esperado: Username, Password, Role
		if len(record) < 3 {
			errorCount++
			continue
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(record[1]), bcrypt.DefaultCost)
		user := User{
			Username: record[0],
			Password: string(hashedPassword),
			Role:     record[2],
		}

		if err := db.Create(&user).Error; err != nil {
			errorCount++
		} else {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Importação de usuários concluída",
		"success": successCount,
		"errors":  errorCount,
	})
}

// ==========================================
// 6. JOBS & BACKGROUND TASKS
// ==========================================

// --- REPORTS HANDLER ---

type ReportStats struct {
	TotalTickets      int64            `json:"total_tickets"`
	OpenTickets       int64            `json:"open_tickets"`
	ResolvedTickets   int64            `json:"resolved_tickets"`
	AvgMTTRHours      float64          `json:"mttr_hours"` // Tempo médio de resolução
	SLAComplianceRate float64          `json:"sla_compliance_rate"`
	TicketsByCategory map[string]int64 `json:"tickets_by_category"`
	SatisfactionScore float64          `json:"satisfaction_score"`
	WeeklyTrend       []DailyTrend     `json:"weekly_trend"`
}

type DailyTrend struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

func GetReports(c *gin.Context) {
	// Verificar Permissão Dinâmica para 'User'
	role := c.MustGet("role").(string)
	if role == "User" {
		var setting SystemSetting
		db.First(&setting, "key = ?", "user_view_reports")
		if setting.Value != "true" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado a relatórios"})
			return
		}
	}

	var stats ReportStats
	techID := c.Query("tech_id")

	// Função auxiliar para aplicar filtros
	// Usamos clone do DB para não acumular filtros na instancia global se fosse o caso (aqui é local var, ok)
	filter := func(tx *gorm.DB) *gorm.DB {
		if techID != "" {
			return tx.Where("assigned_to_id = ?", techID)
		}
		return tx
	}

	// Contagens Básicas
	filter(db.Model(&Ticket{})).Count(&stats.TotalTickets)
	filter(db.Model(&Ticket{}).Where("status != ? AND status != ?", "Resolvido", "Fechado")).Count(&stats.OpenTickets)
	filter(db.Model(&Ticket{}).Where("status = ?", "Resolvido")).Count(&stats.ResolvedTickets)

	// Agrupamento por Categoria
	// Nota: Join pode precisar de alias ou cuidado se ticket tbm tiver filtro
	// Se filtrar por techID (assigned_to_id em tickets), o filtro deve ser na tabela tickets
	catQuery := db.Table("tickets").Select("service_categories.name, count(tickets.id)").
		Joins("left join service_categories on service_categories.id = tickets.category_id")

	if techID != "" {
		catQuery = catQuery.Where("tickets.assigned_to_id = ?", techID)
	}

	rows, err := catQuery.Group("service_categories.name").Rows()

	stats.TicketsByCategory = make(map[string]int64)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			var count int64
			if err := rows.Scan(&name, &count); err == nil {
				if name == "" {
					name = "Sem Categoria"
				}
				stats.TicketsByCategory[name] = count
			}
		}
	}

	// Cálculo MTTR e SLA (Iterar sobre tickets resolvidos)
	var resolvedTickets []Ticket
	filter(db.Where("status = ?", "Resolvido")).Find(&resolvedTickets)

	var totalTimeHours float64
	var slaMetCount int64

	if len(resolvedTickets) > 0 {
		for _, t := range resolvedTickets {
			duration := t.UpdatedAt.Sub(t.CreatedAt).Hours()
			totalTimeHours += duration

			if t.UpdatedAt.Before(t.DueDate) || t.UpdatedAt.Equal(t.DueDate) {
				slaMetCount++
			}
		}
		stats.AvgMTTRHours = totalTimeHours / float64(len(resolvedTickets))
		stats.SLAComplianceRate = (float64(slaMetCount) / float64(len(resolvedTickets))) * 100
	} else {
		stats.AvgMTTRHours = 0
		stats.SLAComplianceRate = 100
	}

	stats.SatisfactionScore = 5.0 // Placeholder

	// Tendência Semanal (Últimos 7 dias)
	// SQLite: strftime('%d/%m', created_at)
	dateQuery := db.Table("tickets").
		Select("strftime('%d/%m', created_at) as day, count(id)").
		Where("created_at >= date('now', '-6 days')")

	if techID != "" {
		dateQuery = dateQuery.Where("assigned_to_id = ?", techID)
	}

	trendRows, err := dateQuery.Group("day").Order("day").Rows()

	// Mapa para preencher dias faltantes se quiser, mas vamos simplificar
	stats.WeeklyTrend = []DailyTrend{}
	if err == nil {
		defer trendRows.Close()
		for trendRows.Next() {
			var day string
			var count int64
			trendRows.Scan(&day, &count)
			stats.WeeklyTrend = append(stats.WeeklyTrend, DailyTrend{Date: day, Count: count})
		}
	}

	c.JSON(http.StatusOK, stats)
}

func GetTechs(c *gin.Context) {
	var techs []User
	if err := db.Where("role IN ?", []string{"Tech", "Admin"}).Find(&techs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, techs)
}

func runSLAMonitor() {
	// Verifica a cada 1 minuto (para teste) - Em prod seria maior
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		checkSLA()
	}
}

func checkSLA() {
	// Buscar tickets não resolvidos que possuam categoria definida
	var tickets []Ticket
	if err := db.Preload("Category").Where("status != ? AND status != ? AND category_id IS NOT NULL", "Resolvido", "Fechado").Find(&tickets).Error; err != nil {
		return
	}

	for _, t := range tickets {
		if t.Category == nil {
			continue
		}

		// Definir Timeout (Default 4h se não configurado)
		timeoutHours := 4
		if t.Category.SLATimeout > 0 {
			timeoutHours = t.Category.SLATimeout
		}

		limitTime := t.CreatedAt.Add(time.Duration(timeoutHours) * time.Hour)

		// Se o tempo atual for maior que o tempo limite (estourou SLA)
		if time.Now().After(limitTime) {
			// Verificar se há uma regra de escalonamento configurada
			if t.Category.EscalationUserID != nil {
				escalationID := *t.Category.EscalationUserID

				// Só escalonar se o ticket JÁ NÃO estiver com o usuário de escalonamento
				if t.AssignedToID == nil || *t.AssignedToID != escalationID {
					fmt.Printf("SLA Trigger: Escalando Ticket %d para UserID %d\n", t.ID, escalationID)

					oldAssigned := "Ninguém"
					if t.AssignedToID != nil {
						oldAssigned = fmt.Sprintf("User %d", *t.AssignedToID)
					}

					t.AssignedToID = &escalationID
					db.Save(&t)

					// Comentário de Sistema
					db.Create(&Comment{
						TicketID: t.ID,
						Author:   "System Bot",
						Content:  fmt.Sprintf("⚠ SLA VIOLADO (%dh): Reatribuído automaticamente de %s para supervisão.", timeoutHours, oldAssigned),
					})
				}
			}
		}
	}
}

// TriggerUpdate cria um arquivo de gatilho para o script watcher reiniciar o sistema
func TriggerUpdate(c *gin.Context) {
	// Verificar se já existe (debounce)
	triggerFile := "update_request"

	// Tentar criar no diretório persistente 'data' se possível, senão na raiz do workdir
	// No Docker, WORKDIR é /app e data é /app/data.
	if _, err := os.Stat("data"); err == nil {
		triggerFile = "data/update_request"
	}

	if _, err := os.Stat(triggerFile); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Atualização já solicitada. Aguarde o reinício."})
		return
	}

	file, err := os.Create(triggerFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao solicitar atualização: " + err.Error()})
		return
	}
	defer file.Close()
	file.WriteString(time.Now().Format(time.RFC3339))

	// Pegar userID do contexto (setado pelo JWT middleware)
	// Precisamos garantir que é uint
	userIDVal, _ := c.Get("userID")
	var userID uint
	if val, ok := userIDVal.(float64); ok {
		userID = uint(val)
	} else if val, ok := userIDVal.(uint); ok {
		userID = val
	}

	logAction(uint(userID), "SYSTEM_UPDATE", "System", 0, "Atualização de sistema solicitada via painel")

	c.JSON(http.StatusOK, gin.H{
		"message": "Atualização solicitada com sucesso. O sistema buscará a nova versão e reiniciará em instantes.",
	})
}

// DebugUsers - Endpoint de diagnóstico para verificar usuários no banco
func DebugUsers(c *gin.Context) {
	var users []User
	var count int64

	db.Model(&User{}).Count(&count)
	db.Select("id, username, role, full_name, created_at").Find(&users)

	c.JSON(http.StatusOK, gin.H{
		"total": count,
		"users": users,
	})
}

// SetupInitialAdmin - Cria o usuário admin inicial (apenas se não houver usuários)
func SetupInitialAdmin(c *gin.Context) {
	var count int64
	db.Model(&User{}).Count(&count)

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":       "Sistema já possui usuários cadastrados. Use o login normal.",
			"total_users": count,
		})
		return
	}

	// Criar admin com senha padrão
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar senha"})
		return
	}

	admin := User{
		Username: "admin",
		Password: string(hashedPassword),
		Role:     "Admin",
		FullName: "Administrador",
	}

	if err := db.Create(&admin).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao criar usuário admin: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Usuário admin criado com sucesso!",
		"username": "admin",
		"password": "admin123",
		"note":     "Por favor, altere a senha após o primeiro login.",
	})
}
