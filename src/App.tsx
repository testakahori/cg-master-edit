import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Upload, 
  Trash2, 
  Download, 
  Type, 
  Maximize, 
  Image as ImageIcon, 
  Music, 
  ChevronLeft, 
  ChevronRight, 
  Share2,
  Settings2,
  AlignLeft,
  ArrowUpDown,
  Layers,
  CheckSquare,
  Square,
  FileDown,
  Copy,
  X,
  Save
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import { cn } from './lib/utils';
import { ProjectImage, EditorElement, TextElement, SFXElement, ProjectFont, WritingMode } from './types';

// Constants
const DEFAULT_CANVAS_WIDTH = 1216;
const DEFAULT_CANVAS_HEIGHT = 832;

export default function App() {
  // State
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);
  const [sfxLibrary, setSfxLibrary] = useState<{ id: string; url: string; name: string }[]>([]);
  const [fonts, setFonts] = useState<ProjectFont[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT);
  const [zoom, setZoom] = useState(0.6);
  const [clipboard, setClipboard] = useState<EditorElement | null>(null);
  const [lastTextProps, setLastTextProps] = useState<Partial<TextElement>>({
    fontSize: 35,
    color: '#000000',
    writingMode: 'vertical-rl',
    letterSpacing: 4,
    lineHeight: 1.1,
    strokeWidth: 3,
    strokeColor: '#ffffff',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 4,
    shadowOffset: { x: 4, y: 4 },
  });
  const [textPresets, setTextPresets] = useState<{ id: string; name: string; props: Partial<TextElement> }[]>([]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sfxInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const currentImage = images[currentImageIndex] || null;

  // Persistence
  useEffect(() => {
    const savedPresets = localStorage.getItem('cg_text_presets');
    if (savedPresets) {
      try {
        setTextPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error('Failed to load presets', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cg_text_presets', JSON.stringify(textPresets));
  }, [textPresets]);

  // Update image elements
  const updateCurrentImage = useCallback((updater: (img: ProjectImage) => ProjectImage) => {
    if (currentImageIndex === -1) return;
    setImages(prev => {
      const next = [...prev];
      next[currentImageIndex] = updater(next[currentImageIndex]);
      return next;
    });
  }, [currentImageIndex]);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newImages = files.map(file => ({
      id: uuidv4(),
      name: file.name,
      url: URL.createObjectURL(file),
      elements: [],
      width: canvasWidth,
      height: canvasHeight
    }));
    setImages(prev => [...prev, ...newImages]);
    if (currentImageIndex === -1) setCurrentImageIndex(0);
  };

  // Handle SFX Upload
  const handleSfxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newSfx = files.map(file => ({
      id: uuidv4(),
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    setSfxLibrary(prev => [...prev, ...newSfx]);
  };

  // Handle Font Upload
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const family = file.name.split('.')[0].replace(/\s+/g, '-');
      const url = URL.createObjectURL(file);
      const fontFace = new FontFace(family, `url(${url})`);
      fontFace.load().then(loadedFace => {
        document.fonts.add(loadedFace);
        setFonts(prev => [...prev, { id: uuidv4(), name: file.name, family, url }]);
      });
    });
  };

  // Element Actions
  const addText = () => {
    if (!currentImage) return;
    const newText: TextElement = {
      id: uuidv4(),
      type: 'text',
      content: 'ここにテキストを入力',
      x: 100,
      y: 100,
      width: 150, // Smaller default width for vertical
      height: 400, // Taller default for vertical
      fontFamily: fonts[0]?.family || 'sans-serif',
      textAlign: 'start',
      zIndex: currentImage.elements.length,
      // Default / Inherited properties
      fontSize: 35,
      color: '#000000',
      writingMode: 'vertical-rl',
      letterSpacing: 4,
      lineHeight: 1.1,
      strokeWidth: 3,
      strokeColor: '#ffffff',
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 4,
      shadowOffset: { x: 4, y: 4 },
      ...lastTextProps,
    };
    updateCurrentImage(img => ({ ...img, elements: [...img.elements, newText] }));
    setSelectedElementId(newText.id);
  };

  const addSfx = (sfxUrl: string) => {
    if (!currentImage) return;
    const newSfx: SFXElement = {
      id: uuidv4(),
      type: 'sfx',
      url: sfxUrl,
      x: 200,
      y: 200,
      width: 300,
      height: 300,
      zIndex: currentImage.elements.length
    };
    updateCurrentImage(img => ({ ...img, elements: [...img.elements, newSfx] }));
    setSelectedElementId(newSfx.id);
  };

  const deleteElement = (id: string) => {
    updateCurrentImage(img => ({
      ...img,
      elements: img.elements.filter(el => el.id !== id)
    }));
    setSelectedElementId(null);
  };

  const updateElement = (id: string, updates: Partial<EditorElement>) => {
    updateCurrentImage(img => ({
      ...img,
      elements: img.elements.map(el => {
        if (el.id === id) {
          const updated = { ...el, ...updates } as EditorElement;
          // Capture text properties for inheritance
          if (updated.type === 'text') {
            const { id: _, content: __, x: ___, y: ____, width: _____, height: ______, zIndex: _______, ...props } = updated as TextElement;
            setLastTextProps(props);
          }
          return updated;
        }
        return el;
      })
    }));
  };

  const savePreset = () => {
    if (!selectedElementId || !currentImage) return;
    const element = currentImage.elements.find(e => e.id === selectedElementId);
    if (element && element.type === 'text') {
      const { id: _, content: __, x: ___, y: ____, width: _____, height: ______, zIndex: _______, ...props } = element as TextElement;
      const nextNum = textPresets.length + 1;
      const name = `presets${String(nextNum).padStart(2, '0')}`;
      setTextPresets(prev => [...prev, { id: uuidv4(), name, props }]);
    }
  };

  const applyPreset = (presetId: string) => {
    if (!selectedElementId) return;
    const preset = textPresets.find(p => p.id === presetId);
    if (preset) {
      updateElement(selectedElementId, preset.props);
    }
  };

  const copyElement = useCallback(() => {
    if (!currentImage || !selectedElementId) return;
    const element = currentImage.elements.find(e => e.id === selectedElementId);
    if (element) {
      setClipboard({ ...element });
    }
  }, [currentImage, selectedElementId]);

  const pasteElement = useCallback(() => {
    if (!currentImage || !clipboard) return;
    const newElement = {
      ...clipboard,
      id: uuidv4(),
      x: clipboard.x + 20,
      y: clipboard.y + 20,
      zIndex: currentImage.elements.length
    };
    updateCurrentImage(img => ({
      ...img,
      elements: [...img.elements, newElement]
    }));
    setSelectedElementId(newElement.id);
  }, [currentImage, clipboard, updateCurrentImage]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditing = document.activeElement?.getAttribute('contenteditable') === 'true' || 
                        document.activeElement?.tagName === 'INPUT' || 
                        document.activeElement?.tagName === 'TEXTAREA';
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditing && selectedElementId) {
        copyElement();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditing && clipboard) {
        pasteElement();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing && selectedElementId) {
        deleteElement(selectedElementId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyElement, pasteElement, selectedElementId, clipboard, deleteElement]);

  // Export Logic
  const exportImage = async (imgIndex: number, format: 'png' | 'jpeg'): Promise<{ blob: Blob; name: string }> => {
    // We temporary set index to render the hidden canvas container
    // For simplicity in this demo, we assume the canvas is rendered in the UI
    // If we want hidden batch render, we'd need a separate component or a portal
    
    // Switch to target image
    setCurrentImageIndex(imgIndex);
    // Give it a tiny bit to render
    await new Promise(r => setTimeout(r, 100));

    const node = canvasRef.current;
    if (!node) throw new Error('Canvas not found');

    const dataUrl = format === 'png' ? await toPng(node) : await toJpeg(node, { quality: 0.95 });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const name = `${String(imgIndex + 1).padStart(2, '0')}.${format}`;
    return { blob, name };
  };

  const handleBatchDownload = async () => {
    const zip = new JSZip();
    const targets = selectedExportIds.size > 0 
      ? images.filter(img => selectedExportIds.has(img.id))
      : images;

    if (targets.length === 0) return alert('書き出す画像がありません');

    for (const [index, img] of targets.entries()) {
      const idx = images.indexOf(img);
      const { blob, name } = await exportImage(idx, 'png');
      zip.file(name, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CG_Collection_${new Date().getTime()}.zip`;
    link.click();
  };

  const handleSingleDownload = async (img: ProjectImage) => {
    const idx = images.indexOf(img);
    const { blob, name } = await exportImage(idx, 'png');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  // SNS Share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'CG-Master Edit',
        text: '素晴らしいCGを作成しました！',
        url: window.location.href
      }).catch(console.error);
    } else {
      alert('ブラウザがシェア機能に対応していません');
    }
  };

  const duplicateImage = (id: string) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy = {
        ...original,
        id: uuidv4(),
        // Deep copy elements and give them new unique IDs to avoid overlaps
        elements: original.elements.map(el => ({ ...el, id: uuidv4() })),
        name: `${original.name} (copy)`
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedExportIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedExportIds(next);
  };

  return (
    <div className="flex h-screen w-full bg-[#111111] font-sans selection:bg-pink-500 selection:text-white overflow-hidden relative">
      {/* Mobile Sidebar Overlays */}
      <AnimatePresence>
        {isLeftSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLeftSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-[60] xl:hidden backdrop-blur-sm"
          />
        )}
        {isRightSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsRightSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-[60] xl:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Left Column: Image Management */}
      <div className={cn(
        "fixed xl:relative w-64 h-full border-r border-white/10 flex flex-col bg-[#0a0a0a] shrink-0 z-[70] transition-transform duration-300 xl:translate-x-0",
        isLeftSidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
      )}>
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          <div className="flex items-center justify-between xl:block">
            <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
              <ImageIcon size={14} /> GALLERY
            </h2>
            <button onClick={() => setIsLeftSidebarOpen(false)} className="xl:hidden p-1 text-zinc-500">
              <ChevronLeft size={20} />
            </button>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded flex items-center justify-center gap-2 border border-white/5 transition-all active:scale-95 shadow-sm"
          >
            <Upload size={14} /> 画像アップロード
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageUpload} 
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-2">
            {images.map((img, idx) => (
              <Reorder.Item 
                key={img.id} 
                value={img}
                className={cn(
                  "group relative rounded-xl border border-white/5 bg-[#161616] p-1 cursor-pointer transition-all hover:bg-zinc-800",
                  currentImageIndex === idx && "ring-2 ring-blue-500 border-transparent shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                )}
                onClick={() => setCurrentImageIndex(idx)}
              >
                <div className="aspect-video relative rounded-lg overflow-hidden bg-black">
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-black/80 px-2 py-1 rounded text-[10px] font-mono font-bold">{idx + 1}</div>
                  </div>
                  
                  <div className="absolute top-1 left-1 flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(img.id);
                      }}
                      className="p-1 rounded-md bg-black/60 hover:bg-black/80 transition-colors"
                    >
                      {selectedExportIds.has(img.id) ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} className="text-zinc-400" />}
                    </button>
                  </div>

                  <div className="absolute top-1 right-1 flex gap-1 transform translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateImage(img.id);
                      }}
                      className="p-1.5 bg-blue-600/90 rounded-md hover:bg-blue-500 transition-colors shadow-lg"
                      title="複製"
                    >
                      <Copy size={12} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setImages(prev => prev.filter(i => i.id !== img.id));
                        if (currentImageIndex === idx) setCurrentImageIndex(-1);
                      }}
                      className="p-1.5 bg-red-600/90 rounded-md hover:bg-red-500 transition-colors shadow-lg"
                      title="削除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#0d0d0d]">
          <button 
            onClick={handleBatchDownload}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(37,99,235,0.3)] active:scale-[0.98]"
          >
            <Download size={14} /> ZIPで一括保存
          </button>
        </div>
      </div>

      {/* Center Column: Toolbar and Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative shadow-2xl z-10 overflow-hidden">
        {/* Unified Toolbar */}
        <div className="bg-zinc-900 border-b border-white/10 p-2 min-h-[56px] flex items-center gap-2 sm:gap-4 shrink-0 z-50 overflow-x-auto custom-scrollbar no-scrollbar">
          {/* Mobile Toggle Buttons */}
          <div className="flex xl:hidden gap-1 pr-2 border-r border-white/5">
            <button 
              onClick={() => setIsLeftSidebarOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400"
            >
              <ImageIcon size={18} />
            </button>
            <button 
              onClick={() => setIsRightSidebarOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400"
            >
              <Music size={18} />
            </button>
          </div>

          {/* Navigation & Add */}
          <div className="flex items-center gap-2 pr-4 border-r border-white/5 shrink-0">
            <div className="flex bg-black rounded p-0.5 border border-white/5 shrink-0">
              <button 
                onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                className="p-1.5 hover:bg-zinc-800 rounded transition-colors disabled:opacity-20"
                disabled={currentImageIndex <= 0}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 flex items-center text-[10px] font-black font-mono text-zinc-400">
                {currentImageIndex + 1} / {images.length}
              </div>
              <button 
                onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                className="p-1.5 hover:bg-zinc-800 rounded transition-colors disabled:opacity-20"
                disabled={currentImageIndex >= images.length - 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <button 
              onClick={addText}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-[11px] font-black border border-white/10 flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Type size={14} className="text-blue-400" /> 文字を入力
            </button>

            {/* Mobile Save Button */}
            <button 
              onClick={() => currentImage && handleSingleDownload(currentImage)}
              disabled={!currentImage}
              className="md:hidden px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-md text-[11px] font-black transition-all text-white shadow-lg active:scale-95 disabled:shadow-none disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>

          {/* Conditional Text Properties */}
          {selectedElementId && currentImage?.elements.find(e => e.id === selectedElementId)?.type === 'text' ? (
            <div className="flex-1 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 min-w-[600px]">
              {/* Row 1 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 pr-4 border-r border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Style</span>
                    <div className="flex items-center gap-1.5">
                      <select 
                        className="bg-black border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 min-w-[120px] focus:ring-1 focus:ring-blue-500 outline-none"
                        onChange={(e) => applyPreset(e.target.value)}
                        value=""
                      >
                        <option value="" disabled>{textPresets.length === 0 ? 'スタイル未保存' : '保存から選択'}</option>
                        {textPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button 
                        onClick={savePreset}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded transition-all active:scale-90"
                        title="スタイルを保存"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pr-4 border-r border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Typography</span>
                    <div className="flex items-center gap-2">
                      <select 
                        className="bg-black border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 min-w-[140px] focus:ring-1 focus:ring-blue-500 outline-none"
                        value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).fontFamily}
                        onChange={(e) => updateElement(selectedElementId, { fontFamily: e.target.value })}
                      >
                        <option value="sans-serif">System Sans</option>
                        <option value="serif">System Serif</option>
                        {fonts.map(f => <option key={f.id} value={f.family}>{f.name}</option>)}
                      </select>
                      <input 
                        type="number" 
                        className="w-14 bg-black border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-200 focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).fontSize}
                        onChange={(e) => updateElement(selectedElementId, { fontSize: parseInt(e.target.value) || 12 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 pr-4 border-r border-white/5">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Layout</span>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-black p-0.5 rounded border border-white/5 shadow-inner">
                      <button 
                        onClick={() => updateElement(selectedElementId, { writingMode: 'horizontal-tb' })}
                        className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition-all", (currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).writingMode === 'horizontal-tb' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-400")}
                      >横</button>
                      <button 
                        onClick={() => updateElement(selectedElementId, { writingMode: 'vertical-rl' })}
                        className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition-all", (currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).writingMode === 'vertical-rl' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-400")}
                      >縦</button>
                    </div>
                    <div className="flex bg-black p-0.5 rounded border border-white/5 shadow-inner">
                      {['start', 'center', 'end'].map(a => (
                        <button 
                          key={a}
                          onClick={() => updateElement(selectedElementId, { textAlign: a as any })}
                          className={cn("px-2 py-1 rounded text-[10px] font-bold transition-all", (currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).textAlign === a ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-400")}
                        >{a === 'start' ? '左' : a === 'center' ? '中' : '右'}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Appearance</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-black rounded-lg px-2 py-1 border border-white/5 hover:border-zinc-700 transition-colors group">
                        <div className="w-3.5 h-3.5 rounded-sm border border-white/10 group-hover:scale-110 transition-transform" style={{ backgroundColor: (currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).color }} />
                        <input 
                          type="color" 
                          className="w-0 h-0 opacity-0 absolute" 
                          id="textColorFlat"
                          value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).color}
                          onChange={(e) => updateElement(selectedElementId, { color: e.target.value })}
                        />
                        <label htmlFor="textColorFlat" className="text-[10px] font-bold text-zinc-400 cursor-pointer">文字色</label>
                      </div>
                      <div className="flex items-center gap-2 bg-black rounded-lg px-2 py-1 border border-white/5 hover:border-zinc-700 transition-colors group">
                        <div className="w-3.5 h-3.5 rounded-sm border border-white/10 group-hover:scale-110 transition-transform" style={{ backgroundColor: (currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).strokeColor }} />
                        <input 
                          type="color" 
                          className="w-0 h-0 opacity-0 absolute" 
                          id="outlineColorFlat"
                          value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).strokeColor}
                          onChange={(e) => updateElement(selectedElementId, { strokeColor: e.target.value })}
                        />
                        <label htmlFor="outlineColorFlat" className="text-[10px] font-bold text-zinc-400 cursor-pointer">枠線</label>
                      </div>
                    </div>
                    
                    <div className="h-4 w-px bg-white/5 mx-1" />

                    <button 
                      onClick={() => deleteElement(selectedElementId)} 
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-wrap items-center gap-4 pt-1.5 border-t border-white/5">
                <div className="flex flex-col gap-1 pr-4 border-r border-white/5">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Letter Spacing</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" min="-10" max="50" step="1" 
                      value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).letterSpacing}
                      onChange={(e) => updateElement(selectedElementId, { letterSpacing: parseInt(e.target.value) })}
                      className="w-32 h-1 bg-black rounded-lg appearance-none accent-blue-500"
                    />
                    <span className="text-[10px] text-zinc-400 font-mono w-6 text-right">{(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).letterSpacing}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 pr-4 border-r border-white/5">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Line Height</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" min="0.5" max="3" step="0.1" 
                      value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).lineHeight}
                      onChange={(e) => updateElement(selectedElementId, { lineHeight: parseFloat(e.target.value) })}
                      className="w-32 h-1 bg-black rounded-lg appearance-none accent-blue-500"
                    />
                    <span className="text-[10px] text-zinc-400 font-mono w-6 text-right">{(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).lineHeight}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest pl-1">Outline Width</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" min="0" max="25" step="0.5" 
                      value={(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).strokeWidth}
                      onChange={(e) => updateElement(selectedElementId, { strokeWidth: parseFloat(e.target.value) })}
                      className="w-32 h-1 bg-black rounded-lg appearance-none accent-blue-500"
                    />
                    <span className="text-[10px] text-zinc-400 font-mono w-6 text-right">{(currentImage!.elements.find(e => e.id === selectedElementId) as TextElement).strokeWidth}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between shrink-0 min-w-[400px]">
              <div className="flex items-center gap-3 text-zinc-600 text-[11px] font-bold tracking-tight whitespace-nowrap">
                <Settings2 size={14} className="text-zinc-700" />
                <span>オブジェクトを選択して下さい</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 ml-4">
                <div className="flex items-center gap-3 bg-black px-3 sm:px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                  <span className="hidden sm:inline text-[9px] text-zinc-500 font-black uppercase tracking-widest whitespace-nowrap">Zoom Control</span>
                  <input 
                    type="range" min="0.1" max="2" step="0.1"
                    value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-24 sm:w-40 h-1 bg-zinc-800 rounded-lg appearance-none accent-blue-500"
                  />
                  <span className="text-[10px] text-white font-mono w-10 text-right font-bold">{Math.round(zoom * 100)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Global Actions */}
          <div className="flex items-center gap-2 pl-4 border-l border-white/5 pr-4">
            <button onClick={handleShare} className="p-2.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white" title="共有">
               <Share2 size={18} />
            </button>
            <button 
              onClick={() => currentImage && handleSingleDownload(currentImage)}
              disabled={!currentImage}
              className="hidden md:flex px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-xs font-black transition-all text-white shadow-lg shadow-blue-900/20 active:scale-95 disabled:shadow-none disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div 
          className="flex-1 overflow-auto bg-[#1a1a1a] flex items-center justify-center p-4 sm:p-10 md:p-20 pattern-dots relative" 
          style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 0)', backgroundSize: '32px 32px' }}
          onClick={() => setSelectedElementId(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const sfxUrl = e.dataTransfer.getData('sfxUrl');
            if (sfxUrl && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const x = (e.clientX - rect.left) / zoom;
              const y = (e.clientY - rect.top) / zoom;
              
              const newSfx: SFXElement = {
                id: uuidv4(),
                type: 'sfx',
                url: sfxUrl,
                x: x - 150, 
                y: y - 150,
                width: 300,
                height: 300,
                zIndex: currentImage?.elements.length || 0
              };
              updateCurrentImage(img => ({ ...img, elements: [...img.elements, newSfx] }));
              setSelectedElementId(newSfx.id);
            }
          }}
        >
          <div className="relative shadow-[0_40px_80px_rgba(0,0,0,0.9)] bg-black" 
               style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease' }}>
            {currentImage ? (
              <div 
                ref={canvasRef}
                className="relative bg-black overflow-hidden" 
                style={{ width: canvasWidth, height: canvasHeight }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Background Image */}
                <img src={currentImage.url} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="" />
                
                {/* Elements */}
                {(currentImage.elements as EditorElement[]).map((el: EditorElement) => (
                  <EditorComponent 
                    key={el.id} 
                    element={el} 
                    zoom={zoom}
                    isSelected={selectedElementId === el.id}
                    onSelect={() => setSelectedElementId(el.id)}
                    onUpdate={(up) => updateElement(el.id, up)}
                    onDelete={() => deleteElement(el.id)}
                    onCopy={() => copyElement()}
                  />
                ))}
              </div>
            ) : (
              <div className="w-[960px] h-[540px] bg-zinc-900/30 rounded-3xl border-4 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-8 backdrop-blur-sm">
                <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-700 animate-pulse border border-white/5 shadow-2xl">
                  <ImageIcon size={48} />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-black text-zinc-400 uppercase tracking-tighter">Ready to Create?</h3>
                  <p className="text-zinc-600 text-sm font-medium">画像をアップロードしてプロジェクトを開始してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: SFX Assets & Canvas Size */}
      <div className={cn(
        "fixed xl:relative right-0 w-80 h-full border-l border-white/10 bg-[#0a0a0a] flex flex-col overflow-hidden shrink-0 z-[70] transition-transform duration-300 xl:translate-x-0",
        isRightSidebarOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
      )}>
        {/* Canvas Size Section */}
        <div className="p-5 border-b border-white/10 bg-[#0d0d0d] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Maximize size={14} className="text-blue-500" /> Canvas size
            </h3>
            <button onClick={() => setIsRightSidebarOpen(false)} className="xl:hidden p-1 text-zinc-500">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest pl-1">Width</label>
              <input 
                type="number" 
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 outline-none text-zinc-200 shadow-inner" 
                value={canvasWidth}
                onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest pl-1">Height</label>
              <input 
                type="number" 
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 outline-none text-zinc-200 shadow-inner" 
                value={canvasHeight}
                onChange={(e) => setCanvasHeight(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* SFX Assets Library */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#080808]">
          <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0 bg-[#0d0d0d]">
            <h3 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Music size={14} className="text-pink-500" /> SFX Assets
            </h3>
            <div className="flex gap-1">
              <button 
                onClick={() => sfxInputRef.current?.click()}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-2 rounded-lg transition-all active:scale-90"
                title="SFXを追加"
              >
                <Plus size={16} />
              </button>
            </div>
            <input 
              type="file" 
              ref={sfxInputRef} 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleSfxUpload} 
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {sfxLibrary.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-800 gap-6 p-8 border-2 border-dashed border-white/5 rounded-3xl opacity-50">
                <Music size={60} strokeWidth={1} />
                <p className="text-[10px] text-center uppercase tracking-[0.3em] font-black leading-relaxed">
                  EMPTY LIBRARY
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-8">
                {sfxLibrary.map(sfx => (
                  <div 
                    key={sfx.id} 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('sfxUrl', sfx.url);
                    }}
                    onClick={() => addSfx(sfx.url)}
                    className="aspect-square bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative group cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="w-full h-full p-2 bg-[#050505] flex items-center justify-center">
                      <img src={sfx.url} className="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" alt="" />
                    </div>
                    <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
                       <div className="bg-blue-600 p-2 rounded-full shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                         <Plus size={24} className="text-white" />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent for Editor Elements
interface EditorComponentProps {
  key?: string;
  element: EditorElement;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (up: Partial<EditorElement>) => void;
  onDelete: () => void;
  onCopy: () => void;
}

function EditorComponent({ element, zoom, isSelected, onSelect, onUpdate, onDelete, onCopy }: EditorComponentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync content with state when not focused
  useEffect(() => {
    if (element.type === 'text' && contentRef.current) {
      const textEl = element as TextElement;
      const displayContent = textEl.content || '&nbsp;';
      if (document.activeElement !== contentRef.current && contentRef.current.innerHTML !== displayContent) {
        contentRef.current.innerHTML = displayContent;
      }
    }
  }, [element]);

  // Drag handler
  const handleDragDown = (e: React.PointerEvent) => {
    // Allows focus to transition naturally if we're clicking the contentEditable area
    if (document.activeElement === contentRef.current && contentRef.current?.contains(e.target as Node)) {
      return;
    }

    e.stopPropagation();
    onSelect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = element.x;
    const initialY = element.y;

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;
      onUpdate({ 
        x: initialX + deltaX, 
        y: initialY + deltaY 
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Resize handler
  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = element.width;
    const startH = element.height;

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;
      onUpdate({ 
        width: Math.max(20, startW + deltaX),
        height: Math.max(20, startH + deltaY)
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (element.type === 'text') {
    const textEl = element as TextElement;
    
    // Initial display content
    const displayContent = textEl.content || '&nbsp;';

    return (
      <div
        onPointerDown={handleDragDown}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={cn(
          "absolute cursor-move transition-shadow flex",
          isSelected && "outline outline-4 outline-blue-500 ring-2 ring-white/50 bg-blue-500/10 z-50 shadow-xl",
          textEl.writingMode === 'vertical-rl' ? "vertical-text" : ""
        )}
        style={{ 
          left: `${textEl.x}px`, 
          top: `${textEl.y}px`, 
          width: `${textEl.width}px`, 
          height: `${textEl.height}px`,
          zIndex: isSelected ? 999 : textEl.zIndex,
          writingMode: textEl.writingMode,
        }}
      >
        <div className="relative w-full h-full" style={{ 
          writingMode: 'inherit',
          filter: `drop-shadow(${textEl.shadowOffset.x}px ${textEl.shadowOffset.y}px ${textEl.shadowBlur}px ${textEl.shadowColor})`,
        }}>
          {/* Layer 1: The Outline (Behind) */}
          <div 
            className={cn(
              "absolute inset-0 text-outline-layer font-bold pointer-events-none whitespace-pre-wrap break-all p-2",
              textEl.writingMode === 'vertical-rl' ? "vertical-text" : ""
            )}
            style={{ 
              fontSize: `${textEl.fontSize}px`, 
              color: 'transparent',
              fontFamily: textEl.fontFamily,
              letterSpacing: `${textEl.letterSpacing}px`,
              lineHeight: textEl.lineHeight,
              writingMode: 'inherit',
              textAlign: textEl.textAlign,
              WebkitTextStrokeWidth: `${textEl.strokeWidth * 2}px`,
              WebkitTextStrokeColor: textEl.strokeColor,
              pointerEvents: 'none',
              display: 'block'
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />

          {/* Layer 2: The Text Fill (Front & Editable) */}
          <div 
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              onUpdate({ content: e.currentTarget.innerHTML });
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
            onBlur={(e) => {
              onUpdate({ content: e.currentTarget.innerHTML });
            }}
            className={cn(
              "text-fill-layer text-element-content font-bold outline-none whitespace-pre-wrap break-all relative z-10 p-2 h-full w-full",
              textEl.writingMode === 'vertical-rl' ? "vertical-text" : ""
            )}
            style={{ 
              fontSize: `${textEl.fontSize}px`, 
              color: textEl.color, 
              fontFamily: textEl.fontFamily,
              letterSpacing: `${textEl.letterSpacing}px`,
              lineHeight: textEl.lineHeight,
              writingMode: 'inherit',
              textAlign: textEl.textAlign,
              pointerEvents: 'auto',
              display: 'block'
            }}
          />
        </div>

        {/* Resize Handler */}
        {isSelected && (
          <>
            {/* Copy Button (Top Left) */}
            <button 
              className="absolute -left-2 -top-2 w-6 h-6 bg-green-600 rounded-full border-2 border-white cursor-pointer z-[1001] shadow-md flex items-center justify-center hover:scale-110 transition-transform pointer-events-auto"
              onPointerDown={(e) => { e.stopPropagation(); onCopy(); }}
              title="コピー"
            >
              <Copy size={12} className="text-white" />
            </button>

            {/* Delete Button (Top Right) */}
            <button 
              className="absolute -right-2 -top-2 w-6 h-6 bg-red-600 rounded-full border-2 border-white cursor-pointer z-[1001] shadow-md flex items-center justify-center hover:scale-110 transition-transform pointer-events-auto"
              onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}
              title="削除"
            >
              <X size={14} className="text-white" strokeWidth={3} />
            </button>

            {/* Resize Handle */}
            <div 
              className="absolute -right-2 -bottom-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white cursor-nwse-resize z-50 shadow-md flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform"
              onPointerDown={handleResizeDown}
            >
              <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-white rotate-45 mb-0.5 mr-0.5" />
            </div>
          </>
        )}
      </div>
    );
  }


  // SFX Element
  return (
    <div
      onPointerDown={handleDragDown}
      className={cn(
        "absolute cursor-move select-none group",
        isSelected && "outline outline-4 outline-blue-500 ring-2 ring-white/50 z-50"
      )}
      style={{ 
        left: `${element.x}px`, 
        top: `${element.y}px`, 
        width: `${element.width}px`, 
        height: `${element.height}px`,
        zIndex: isSelected ? 999 : element.zIndex,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <img src={element.url} className="w-full h-full object-contain pointer-events-none" alt="" />
      
      {/* Resize Handler */}
      {isSelected && (
        <div 
          className="absolute -right-2 -bottom-2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white cursor-nwse-resize z-50 shadow-md flex items-center justify-center"
          onPointerDown={handleResizeDown}
        >
           <div className="w-2 h-2 border-r-2 border-b-2 border-white rotate-45 mb-0.5 mr-0.5" />
        </div>
      )}
    </div>
  );
}
