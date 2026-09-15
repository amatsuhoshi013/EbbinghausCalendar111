/** 底图元数据（图片本体存放在存储层的 blob 空间，不进入 state）。 */
export interface Background {
  id: string;
  name: string;
  /** 黑色蒙版不透明度 0..1 */
  overlayOpacity?: number;
  /** 图片模糊 px（0..30） */
  blur?: number;
  /** 亮度 0.5..1.5 */
  brightness?: number;
  createdAt: string;
  updatedAt: string;
}
