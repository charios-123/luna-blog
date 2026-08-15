package data

import (
	"github.com/charios-123/luna-blog/internal/model/po"
	"gorm.io/gorm"
)

// UserRepo 用户仓储接口
type UserRepo interface {
	// Create 创建用户
	Create(user *po.User) error
	// Update 更新用户
	Update(user *po.User) error
	// FindByID 根据 ID 查询用户
	FindByID(id uint) (*po.User, error)
	// FindByUsername 根据用户名查询用户
	FindByUsername(username string) (*po.User, error)
	// FindByEmail 根据邮箱查询用户
	FindByEmail(email string) (*po.User, error)
}

// userRepo 用户仓储实现
type userRepo struct {
	db *gorm.DB
}

// NewUserRepo 创建用户仓储
func NewUserRepo(db *gorm.DB) UserRepo {
	return &userRepo{db: db}
}

// Create 创建用户
func (r *userRepo) Create(user *po.User) error {
	return r.db.Create(user).Error
}

// Update 更新用户
func (r *userRepo) Update(user *po.User) error {
	return r.db.Save(user).Error
}

// FindByID 根据 ID 查询用户
func (r *userRepo) FindByID(id uint) (*po.User, error) {
	var user po.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername 根据用户名查询用户
func (r *userRepo) FindByUsername(username string) (*po.User, error) {
	var user po.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByEmail 根据邮箱查询用户
func (r *userRepo) FindByEmail(email string) (*po.User, error) {
	var user po.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
