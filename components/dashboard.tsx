"use client"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ImagePlus, Wand2, Eraser, Image as ImageIcon, Save, Download, Edit } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MaskEditor } from "@/components/ui/mask"
import { base64ToUint8Array } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveAs } from 'file-saver';

// Define a type for the request body
interface RequestBody {
  prompt: string;
  negative_prompt: string;
  num_steps: number;
  guidance: number;
  seed: number;
  width: number;
  height: number;
  image?: number[];
  mask?: number[];
  strength?: number;
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("text2img")
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [promptHistory, setPromptHistory] = useState<string[]>([])

  // Form states
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [steps, setSteps] = useState(20)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [batchSize, setBatchSize] = useState(1)
  const [batchCount, setBatchCount] = useState(1)
  const [seed, setSeed] = useState(-1)
  const [useRandomSeed, setUseRandomSeed] = useState(true)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)

  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [maskImage, setMaskImage] = useState<string | null>(null)
  const [isMaskEditorOpen, setIsMaskEditorOpen] = useState(false)

  const sourceImageRef = useRef<HTMLInputElement>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)
    setProgress(0)
    setGeneratedImages([])

    try {
      for (let i = 0; i < batchCount; i++) {
        const requestBody: RequestBody = {
          prompt,
          negative_prompt: negativePrompt,
          num_steps: steps,
          guidance: guidanceScale,
          seed: useRandomSeed ? Math.floor(Math.random() * 1000000) : seed,
          width,
          height
        };

        if (activeTab === 'img2img' || activeTab === 'inpaint') {
          if (!sourceImage) {
            throw new Error("Source image is required for img2img and inpainting");
          }
          const imageArray = base64ToUint8Array(sourceImage);
          requestBody.image = Array.from(imageArray);

          if (activeTab === 'inpaint') {
            if (!maskImage) {
              throw new Error("Mask image is required for inpainting");
            }
            const maskArray = base64ToUint8Array(maskImage);
            requestBody.mask = Array.from(maskArray);
          }

          requestBody.strength = denoisingStrength;
        }

        const response = await fetch('https://ai.huston.workers.dev/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}\n${errorText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setGeneratedImages(prev => [...prev, imageUrl]);
        setProgress(((i + 1) / batchCount) * 100);
      }

      setPromptHistory(prev => [prompt, ...prev.slice(0, 9)])
      setIsPreviewOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSourceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSourceImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMaskSave = (maskDataURL: string) => {
    setMaskImage(maskDataURL);
    setIsMaskEditorOpen(false);
  }

  const openMaskEditor = () => {
    if (sourceImage) {
      setIsMaskEditorOpen(true)
    } else {
      setError("Please upload a source image first")
    }
  }

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev =>
      prev.includes(imageUrl)
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    )
  }

  const dimensionOptions = [256, 512, 768, 1024]

  const handleSave = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = (imageUrl: string) => {
    saveAs(imageUrl, `generated-image-${Date.now()}.png`);
  };

  const handleBulkDownload = () => {
    selectedImages.forEach((imageUrl, index) => {
      saveAs(imageUrl, `generated-image-${index + 1}-${Date.now()}.png`);
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Stable Diffusion</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-1 h-auto">
              <TabsTrigger value="text2img" className="flex items-center justify-start px-4 py-2">
                <Wand2 className="mr-2 h-4 w-4" />
                Text to Image
              </TabsTrigger>
              <TabsTrigger value="img2img" className="flex items-center justify-start px-4 py-2">
                <ImageIcon className="mr-2 h-4 w-4" />
                Image to Image
              </TabsTrigger>
              <TabsTrigger value="inpaint" className="flex items-center justify-start px-4 py-2">
                <Eraser className="mr-2 h-4 w-4" />
                Inpainting
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="text2img">
            <h2 className="text-2xl font-semibold mb-4">Text to Image</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="negativePrompt">Negative Prompt</Label>
                <Textarea
                  id="negativePrompt"
                  placeholder="Enter negative prompt here..."
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                />
              </div>
              <div className="flex space-x-4">
                <div className="w-1/2">
                  <Label htmlFor="width">Width</Label>
                  <Select value={width.toString()} onValueChange={(value) => setWidth(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensionOptions.map((option) => (
                        <SelectItem key={option} value={option.toString()}>{option}px</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-1/2">
                  <Label htmlFor="height">Height</Label>
                  <Select value={height.toString()} onValueChange={(value) => setHeight(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select height" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensionOptions.map((option) => (
                        <SelectItem key={option} value={option.toString()}>{option}px</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Steps: {steps}</Label>
                <Slider
                  value={[steps]}
                  onValueChange={([value]) => setSteps(value)}
                  max={20}
                  step={1}
                />
              </div>
              <div>
                <Label>Guidance Scale: {guidanceScale.toFixed(1)}</Label>
                <Slider
                  value={[guidanceScale]}
                  onValueChange={([value]) => setGuidanceScale(value)}
                  max={20}
                  step={0.1}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="img2img">
            <h2 className="text-2xl font-semibold mb-4">Image to Image</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sourceImage">Source Image</Label>
                <div className="mt-2">
                  <Label htmlFor="sourceImage" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {sourceImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sourceImage} alt="Source" className="max-w-full h-auto mx-auto" />
                      ) : (
                        <>
                          <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-600">
                            Upload an image
                          </span>
                        </>
                      )}
                    </div>
                    <Input
                      id="sourceImage"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      ref={sourceImageRef}
                      onChange={handleSourceImageUpload}
                    />
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>
              <div>
                <Label>Denoising Strength: {denoisingStrength.toFixed(2)}</Label>
                <Slider
                  value={[denoisingStrength]}
                  onValueChange={([value]) => setDenoisingStrength(value)}
                  max={1}
                  step={0.01}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inpaint">
            <h2 className="text-2xl font-semibold mb-4">Inpainting</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sourceImage">Source Image</Label>
                <div className="mt-2">
                  <Label htmlFor="sourceImage" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {sourceImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sourceImage} alt="Source" className="max-w-full h-auto mx-auto" />
                      ) : (
                        <>
                          <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-600">
                            Upload an image
                          </span>
                        </>
                      )}
                    </div>
                    <Input
                      id="sourceImage"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      ref={sourceImageRef}
                      onChange={handleSourceImageUpload}
                    />
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="maskImage">Mask Image</Label>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {maskImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={maskImage} alt="Mask" className="max-w-full h-auto mx-auto" />
                    ) : (
                      <>
                        <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                        <span className="mt-2 block text-sm font-medium text-gray-600">
                          Create or upload mask
                        </span>
                      </>
                    )}
                  </div>
                  <Button onClick={openMaskEditor} disabled={!sourceImage}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Mask
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Common Controls */}
        <div className="mt-6 space-y-4">
          <div>
            <Label>Batch Size: {batchSize}</Label>
            <Slider
              value={[batchSize]}
              onValueChange={([value]) => setBatchSize(value)}
              max={4}
              step={1}
            />
          </div>
          <div>
            <Label>Batch Count: {batchCount}</Label>
            <Slider
              value={[batchCount]}
              onValueChange={([value]) => setBatchCount(value)}
              max={10}
              step={1}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="random-seed"
              checked={useRandomSeed}
              onCheckedChange={setUseRandomSeed}
            />
            <Label htmlFor="random-seed">Use Random Seed</Label>
          </div>
          {!useRandomSeed && (
            <div>
              <Label htmlFor="seed">Seed</Label>
              <Input
                id="seed"
                type="number"
                value={seed}
                onChange={e => setSeed(parseInt(e.target.value))}
                min={-1}
              />
            </div>
          )}
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </div>

        {/* Prompt History */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Prompt History</h3>
          <ScrollArea className="h-32 w-full rounded-md border">
            {promptHistory.map((historyPrompt, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => setPrompt(historyPrompt)}
              >
                {historyPrompt}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        {isLoading && (
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-center mt-2">{Math.round(progress)}% Complete</p>
          </div>
        )}
      </div>

      {/* Preview Gallery */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Generated Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {generatedImages.map((image, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={`Generated ${index + 1}`}
                  className={`w-full h-auto rounded-lg shadow-lg transition-opacity ${
                    selectedImages.includes(image) ? 'opacity-50' : ''
                  }`}
                  onClick={() => toggleImageSelection(image)}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="sm" className="mr-2" onClick={() => handleSave(image)}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDownload(image)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleBulkDownload} disabled={selectedImages.length === 0}>
              Download Selected ({selectedImages.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mask Editor */}
      {sourceImage && (
        <MaskEditor
          sourceImage={sourceImage}
          isOpen={isMaskEditorOpen}
          onClose={() => setIsMaskEditorOpen(false)}
          onSave={handleMaskSave}
        />
      )}
    </div>
  )
}