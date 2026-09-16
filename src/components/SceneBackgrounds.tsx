import type { Scene } from '../data/legacyUi'

export function SceneBackgrounds({ scene }: { scene: Scene }) {
  return (
    <div className="scene-backgrounds" aria-hidden="true">
      <div className={`scene-bg ${scene === 'forest' ? 'active' : ''}`} data-scene="forest">
        <div className="forest-gradient" />
      </div>
      <div className={`scene-bg ${scene === 'starry' ? 'active' : ''}`} data-scene="starry">
        <div className="stars-layer" />
        <div className="twinkling-stars" />
      </div>
      <div className={`scene-bg ${scene === 'stream' ? 'active' : ''}`} data-scene="stream">
        <div className="stream-gradient" />
        <div className="water-ripples" />
      </div>
      <div className={`scene-bg ${scene === 'desert' ? 'active' : ''}`} data-scene="desert">
        <div className="desert-gradient" />
      </div>
    </div>
  )
}
