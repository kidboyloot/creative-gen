import { useMultiProductStore } from '../store/multiProductStore'
import ConnectStep from '../components/multiProduct/ConnectStep'
import CollectionStep from '../components/multiProduct/CollectionStep'
import GalleryTemplateStep from '../components/multiProduct/GalleryTemplateStep'
import ImportJobStep from '../components/multiProduct/ImportJobStep'
import ReviewStep from '../components/multiProduct/ReviewStep'
import PushingStep from '../components/multiProduct/PushingStep'
import PushSuccess from '../components/multiProduct/PushSuccess'

export default function MultiProductCopyPage() {
  const step = useMultiProductStore((s) => s.step)

  switch (step) {
    case 'connect':
      return <ConnectStep />
    case 'collection':
      return <CollectionStep />
    case 'gallery':
      return <GalleryTemplateStep />
    case 'progress':
      return <ImportJobStep />
    case 'review':
      return <ReviewStep />
    case 'pushing':
      return <PushingStep />
    case 'success':
      return <PushSuccess />
    default:
      return <ConnectStep />
  }
}
