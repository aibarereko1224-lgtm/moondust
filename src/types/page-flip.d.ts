declare module 'page-flip/dist/js/page-flip.module.js' {
  type FlipCorner = 'top' | 'bottom'
  type FlipState = 'user_fold' | 'fold_corner' | 'flipping' | 'read'

  interface Point {
    x: number
    y: number
  }

  interface PageRect {
    left: number
    top: number
    width: number
    height: number
    pageWidth: number
  }

  interface PageFlipEvent<T> {
    data: T
    object: PageFlip
  }

  interface PageFlipSettings {
    width: number
    height: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startPage?: number
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    clickEventForward?: boolean
    useMouseEvents?: boolean
    swipeDistance?: number
    showPageCorners?: boolean
    disableFlipByClick?: boolean
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings)
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    flip(page: number, corner?: FlipCorner): void
    flipNext(corner?: FlipCorner): void
    flipPrev(corner?: FlipCorner): void
    turnToPage(page: number): void
    getCurrentPageIndex(): number
    getState(): FlipState
    getBoundsRect(): PageRect
    startUserTouch(point: Point): void
    userStop(point: Point, isSwipe?: boolean): void
    on(event: 'flip', callback: (event: PageFlipEvent<number>) => void): PageFlip
    on(event: 'changeState', callback: (event: PageFlipEvent<FlipState>) => void): PageFlip
    clear(): void
    destroy(): void
  }
}
