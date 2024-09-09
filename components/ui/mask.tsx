import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface MaskEditorProps {
  sourceImage: string
  isOpen: boolean
  onClose: () => void
  onSave: (maskDataURL: string) => void
}

export function MaskEditor({ sourceImage, isOpen, onClose, onSave }: MaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)' // White with 50% opacity
        }
        img.src = sourceImage
      }
    }
  }, [isOpen, sourceImage])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ctx.beginPath()
      ctx.arc(x, y, 10, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const handleSave = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Create a new canvas for the mask
        const maskCanvas = document.createElement('canvas')
        maskCanvas.width = canvas.width
        maskCanvas.height = canvas.height
        const maskCtx = maskCanvas.getContext('2d')
        
        if (maskCtx) {
          // Draw the mask (white areas) on black background
          maskCtx.fillStyle = 'black'
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
          maskCtx.globalCompositeOperation = 'destination-out'
          maskCtx.drawImage(canvas, 0, 0)
          
          const maskDataURL = maskCanvas.toDataURL('image/png')
          onSave(maskDataURL)
          onClose()
        }
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Create Mask</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
            className="border border-gray-300 max-w-full h-auto"
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleSave}>Save Mask</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}