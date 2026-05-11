export type WritingMode = 'horizontal-tb' | 'vertical-rl';

export interface TextElement {
  id: string;
  type: 'text';
  content: string; // HTML for rich text
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  writingMode: WritingMode;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'start' | 'center' | 'end' | 'justify';
  strokeWidth: number;
  strokeColor: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffset: { x: number, y: number };
  zIndex: number;
}

export interface SFXElement {
  id: string;
  type: 'sfx';
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export type EditorElement = TextElement | SFXElement;

export interface ProjectImage {
  id: string;
  name: string;
  url: string;
  elements: EditorElement[];
  width: number;
  height: number;
}

export interface ProjectFont {
  id: string;
  name: string;
  family: string;
  url: string;
}
