package service

import (
	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/model/po"
	"github.com/charios-123/luna-blog/pkg/oss"
	"github.com/charios-123/luna-blog/pkg/response"
	"github.com/gin-gonic/gin"
)

// FileService 文件服务
type FileService struct {
	data *data.Data
}

// NewFileService 创建文件服务
func NewFileService(d *data.Data) *FileService {
	return &FileService{
		data: d,
	}
}

// Upload 上传文件
// @Summary 上传文件
// @Description 上传文件到OSS，支持图片、视频等多种文件类型
// @Tags 文件管理
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "文件"
// @Param folder formData string false "文件夹名称" default(uploads)
// @Success 200 {object} response.Response "上传成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /files/upload [post]
func (s *FileService) Upload(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "文件上传失败")
		return
	}

	// 获取文件夹参数
	folder := c.DefaultPostForm("folder", "uploads")

	// 上传到 OSS
	url, err := oss.UploadFile(file, folder)
	if err != nil {
		response.ServerError(c, "上传文件失败: "+err.Error())
		return
	}

	// 保存文件记录
	fileRecord := &po.File{
		Name:     file.Filename,
		URL:      url,
		Size:     file.Size,
		Type:     folder,
		MimeType: file.Header.Get("Content-Type"),
	}

	if err := s.data.FileRepo.Create(fileRecord); err != nil {
		response.ServerError(c, "保存文件记录失败")
		return
	}

	response.Success(c, gin.H{
		"url":  url,
		"name": file.Filename,
		"size": file.Size,
		"id":   fileRecord.ID,
	})
}
