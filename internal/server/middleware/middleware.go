package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ydcloud-dy/leaf-api/pkg/jwt"
	"github.com/ydcloud-dy/leaf-api/pkg/response"
)

// JWTAuth JWT认证中间件
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "请求头中缺少Authorization")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Authorization格式错误")
			c.Abort()
			return
		}

		claims, err := jwt.ParseToken(parts[1])
		if err != nil {
			response.Unauthorized(c, "无效的Token")
			c.Abort()
			return
		}

		c.Set("admin_id", claims.AdminID)
		c.Set("user_id", claims.AdminID) // For blog users, also set user_id
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// OptionalJWTAuth 可选JWT认证中间件（token存在则解析，不存在不报错）
func OptionalJWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// 没有token，继续处理请求但不设置user_id
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			// token格式错误，继续处理但不设置user_id
			c.Next()
			return
		}

		claims, err := jwt.ParseToken(parts[1])
		if err != nil {
			// token无效，继续处理但不设置user_id
			c.Next()
			return
		}

		// token有效，设置用户信息
		c.Set("admin_id", claims.AdminID)
		c.Set("user_id", claims.AdminID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
