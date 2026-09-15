/** 壁纸与玻璃拟态参数（Phase 10 实现，先占位）。 */
export interface Background {
  id: string;
  imageSource?: string;
  /** 蒙版不透明度 0..1 */
  overlayOpacity?: number;
  /** 背景模糊 px */
  blur?: number;
  /** 亮度 0.5..1.5 */
  brightness?: number;
  createdAt: string;
  updatedAt: string;
}
