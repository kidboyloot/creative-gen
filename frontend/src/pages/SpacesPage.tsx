import { useState } from 'react'
import SpacesCanvas from '../components/spaces/SpacesCanvas'
import TemplateGrid from '../components/spaces/TemplateGrid'
import { useSpacesStore } from '../store/spacesStore'

export default function SpacesPage() {
  const nodes = useSpacesStore(s => s.nodes)
  // Show template gallery if canvas is empty AND user hasn't dismissed it
  const [showCanvas, setShowCanvas] = useState(nodes.length > 0)

  function openCanvas() {
    setShowCanvas(true)
  }

  if (!showCanvas) {
    return (
      <div className="h-full flex flex-col bg-studio-app-bg">
        <TemplateGrid onSelect={openCanvas} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-studio-app-bg">
      <SpacesCanvas onShowTemplates={() => setShowCanvas(false)} />
    </div>
  )
}
