// components/FileManager.tsx
'use client'
import { useState, useEffect } from 'react'
import { File, Folder, Download, Upload, Edit, Trash } from 'lucide-react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

export function FileManager({ serverId, serverName }: { serverId: string, serverName: string }) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const loadFiles = async (path: string = '/') => {
    try {
      const response = await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      setFiles(data.files)
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }

  const openFile = async (filename: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/files/content?path=${encodeURIComponent(currentPath + filename)}`)
      const content = await response.text()
      setFileContent(content)
      setSelectedFile(filename)
      setIsEditing(true)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    
    try {
      await fetch(`/api/servers/${serverId}/files/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath + selectedFile,
          content: fileContent
        })
      })
      setIsEditing(false)
      setSelectedFile(null)
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  const deleteFile = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return
    
    try {
      await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(currentPath + filename)}`, {
        method: 'DELETE'
      })
      loadFiles(currentPath)
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  useEffect(() => {
    loadFiles(currentPath)
  }, [currentPath])

  return (
    <div className="bg-white rounded-lg shadow">
      {/* File Browser */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Path:</span>
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentPath}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* File List */}
        <div>
          <h3 className="font-semibold mb-3">Files & Directories</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <div key={file.name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                {file.type === 'directory' ? (
                  <Folder className="w-4 h-4 text-blue-600" />
                ) : (
                  <File className="w-4 h-4 text-gray-600" />
                )}
                
                <span 
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    if (file.type === 'directory') {
                      setCurrentPath(currentPath + file.name + '/')
                    } else {
                      openFile(file.name)
                    }
                  }}
                >
                  {file.name}
                </span>
                
                {file.type === 'file' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openFile(file.name)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteFile(file.name)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* File Editor */}
        {isEditing && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Editing: {selectedFile}</h3>
              <div className="flex gap-2">
                <button
                  onClick={saveFile}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
            
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="w-full h-96 font-mono text-sm border rounded p-2"
              placeholder="File content..."
            />
          </div>
        )}
      </div>
    </div>
  )
}
