'use client'
import { useState, useEffect, useCallback } from 'react'
import { 
  File, 
  Folder, 
  FolderOpen, 
  Download, 
  Upload, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Plus,
  ArrowLeft,
  Search,
  RefreshCw
} from 'lucide-react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: string
  permissions?: string
}

interface FileManagerProps {
  serverId: string
  serverName: string
  userEmail: string
  nodeId: string
}

export function FileManager({ serverId, serverName, userEmail, nodeId }: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState<'file' | 'folder' | null>(null)
  const [newItemName, setNewItemName] = useState('')

  const loadFiles = useCallback(async (path: string = currentPath) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/servers/${serverId}/files?path=${encodeURIComponent(path)}&serverName=${encodeURIComponent(serverName)}&userEmail=${encodeURIComponent(userEmail)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      } else {
        console.error('Failed to load files:', await response.text())
        setFiles([])
      }
    } catch (error) {
      console.error('Failed to load files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [serverId, serverName, userEmail, currentPath])

  const openFile = useCallback(async (filename: string) => {
    try {
      const filePath = currentPath === '/' ? filename : `${currentPath}/${filename}`
      const response = await fetch(
        `/api/servers/${serverId}/files/content?path=${encodeURIComponent(filePath)}&serverName=${encodeURIComponent(serverName)}&userEmail=${encodeURIComponent(userEmail)}`
      )
      
      if (response.ok) {
        const content = await response.text()
        setFileContent(content)
        setSelectedFile(filename)
        setIsEditing(true)
      } else {
        alert('Failed to open file: ' + await response.text())
      }
    } catch (error) {
      console.error('Failed to open file:', error)
      alert('Failed to open file')
    }
  }, [serverId, serverName, userEmail, currentPath])

  const saveFile = useCallback(async () => {
    if (!selectedFile) return
    
    setIsSaving(true)
    try {
      const filePath = currentPath === '/' ? selectedFile : `${currentPath}/${selectedFile}`
      const response = await fetch(`/api/servers/${serverId}/files/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          content: fileContent,
          serverName,
          userEmail
        })
      })
      
      if (response.ok) {
        setIsEditing(false)
        setSelectedFile(null)
        setFileContent('')
        loadFiles()
      } else {
        alert('Failed to save file: ' + await response.text())
      }
    } catch (error) {
      console.error('Failed to save file:', error)
      alert('Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }, [selectedFile, currentPath, fileContent, serverId, serverName, userEmail, loadFiles])

  const deleteItem = useCallback(async (itemName: string, itemType: 'file' | 'directory') => {
    if (!confirm(`Delete ${itemType} "${itemName}"? This action cannot be undone.`)) return
    
    try {
      const itemPath = currentPath === '/' ? itemName : `${currentPath}/${itemName}`
      const response = await fetch(`/api/servers/${serverId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: itemPath,
          serverName,
          userEmail
        })
      })
      
      if (response.ok) {
        loadFiles()
      } else {
        alert('Failed to delete: ' + await response.text())
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete item')
    }
  }, [currentPath, serverId, serverName, userEmail, loadFiles])

  const createItem = useCallback(async () => {
    if (!newItemName.trim() || !showCreateModal) return
    
    try {
      const itemPath = currentPath === '/' ? newItemName : `${currentPath}/${newItemName}`
      const response = await fetch(`/api/servers/${serverId}/files/${showCreateModal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: itemPath,
          serverName,
          userEmail,
          ...(showCreateModal === 'file' && { content: '' })
        })
      })
      
      if (response.ok) {
        setShowCreateModal(null)
        setNewItemName('')
        loadFiles()
      } else {
        alert(`Failed to create ${showCreateModal}: ` + await response.text())
      }
    } catch (error) {
      console.error(`Failed to create ${showCreateModal}:`, error)
      alert(`Failed to create ${showCreateModal}`)
    }
  }, [newItemName, showCreateModal, currentPath, serverId, serverName, userEmail, loadFiles])

  const navigateToPath = useCallback((path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
    setIsEditing(false)
    setFileContent('')
  }, [])

  const goUp = useCallback(() => {
    if (currentPath === '/') return
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    navigateToPath(parentPath)
  }, [currentPath, navigateToPath])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString()
  }

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">File Manager</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal('folder')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              New Folder
            </button>
            <button
              onClick={() => setShowCreateModal('file')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              New File
            </button>
            <button
              onClick={() => loadFiles()}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Navigation & Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            {currentPath !== '/' && (
              <button
                onClick={goUp}
                className="p-1 text-gray-600 hover:text-gray-800"
                title="Go up"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm text-gray-600">Path:</span>
            <span className="font-mono bg-gray-200 px-2 py-1 rounded text-sm">
              {currentPath}
            </span>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1 border rounded text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* File List */}
        <div className="border-r">
          <div className="p-4">
            <h4 className="font-medium mb-3 text-gray-700">Files & Directories</h4>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading files...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? 'No files match your search' : 'This directory is empty'}</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.name} 
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded group"
                  >
                    {file.type === 'directory' ? (
                      <FolderOpen className="w-5 h-5 text-blue-600 shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-gray-600 shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div 
                        className="font-medium cursor-pointer hover:text-blue-600 truncate"
                        onClick={() => {
                          if (file.type === 'directory') {
                            const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`
                            navigateToPath(newPath)
                          } else {
                            openFile(file.name)
                          }
                        }}
                      >
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {file.type === 'file' && `${formatFileSize(file.size)} • `}
                        {formatDate(file.modified)}
                      </div>
                    </div>
                    
                    {file.type === 'file' && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => openFile(file.name)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(file.name, file.type)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {file.type === 'directory' && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteItem(file.name, file.type)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Delete Directory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* File Editor */}
        <div className="min-h-[400px]">
          {isEditing ? (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">
                  Editing: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedFile}</span>
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={saveFile}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedFile(null)
                      setFileContent('')
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
              
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="flex-1 font-mono text-sm border rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="File content..."
                style={{ minHeight: '350px' }}
              />
            </div>
          ) : (
            <div className="p-4 h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Edit3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select a file to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Create New {showCreateModal === 'file' ? 'File' : 'Folder'}
            </h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Enter ${showCreateModal} name...`}
              className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && createItem()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(null)
                  setNewItemName('')
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createItem}
                disabled={!newItemName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}