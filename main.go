package main

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

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

// ==========================================
// 2. CONFIGURAÇÃO E INICIALIZAÇÃO
// ==========================================

func initDB() {
	var err error
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "glpi_clone.db"
	}

	db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		panic("Falha ao conectar ao banco de dados: " + err.Error())
	}

	// AutoMigrate
	err = db.AutoMigrate(&User{}, &Asset{}, &Ticket{}, &Comment{}, &AssetHistory{}, &ServiceCategory{})
	if err != nil {
		panic("Falha na migração do banco de dados")
	}

	seedDatabase()
}

func seedDatabase() {
	// 1. Criar Usuário Admin
	var count int64
	db.Model(&User{}).Count(&count)
	if count == 0 {
		createSeedUser("admin", "Admin", "Administrador")
	}

	// 2. Criar Técnicos Específicos (Mauro, André, Carlos)
	mauro := createSeedUser("mauro", "Tech", "Mauro (Redes)")
	andre := createSeedUser("andre", "Tech", "André (Hardware)")
	carlos := createSeedUser("carlos", "Tech", "Carlos (Softwares)")

	// 3. Criar Categorias de Serviço Iniciais
	seedCategory("Redes e Telefonia", mauro.ID)
	seedCategory("Informática e Impressoras", andre.ID)
	seedCategory("Softwares e Sistemas", carlos.ID)
	seedCategory("Patrimônio e Mobiliário", mauro.ID) // Exemplo: Mauro assume se não tiver outro definido, ou pode ser outro
}

func createSeedUser(username, role, fullName string) User {
	var user User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		user = User{
			Username: username,
			Password: string(hashedPassword),
			Role:     role,
			FullName: fullName,
		}
		db.Create(&user)
		fmt.Printf("Usuário criado: %s\n", username)
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

	var user User
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
		"role": user.Role,
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "username": user.Username, "role": user.Role})
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
	var input Ticket
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Associar ao criador atual
	if userID, exists := c.Get("userID"); exists {
		// O JWT retorna float64 para números numéricos genéricos em map claims
		input.CreatorID = uint(userID.(float64))
	}

	if result := db.Create(&input); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	db.Preload("Asset").Preload("Creator").Preload("Category").Preload("AssignedTo").First(&input, input.ID)
	c.JSON(http.StatusCreated, input)
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
	if err := db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
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
		// Rota Pública
		api.POST("/login", Login)

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

			// Users
			secure.GET("/users", GetUsers)
			secure.GET("/users/techs", GetTechs) // Rota para listar técnicos
			secure.GET("/users/:id", GetUserByID)
			// POST/DELETE movidos para grupo protegido acima
			secure.PUT("/users/:id", UpdateUser) // Update tem proteção interna (self or admin)

			// Import (Movido para grupo protegido)

			// Categories Management (Admin only)
			secure.GET("/categories", GetCategories)
			catGroup := secure.Group("/categories")
			catGroup.Use(RoleMiddleware("Admin"))
			{
				catGroup.POST("/", CreateCategory)
				catGroup.PUT("/:id", UpdateCategory)
				catGroup.DELETE("/:id", DeleteCategory)
			}
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
