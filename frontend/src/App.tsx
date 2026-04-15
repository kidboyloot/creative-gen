import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PlanGate from './components/PlanGate'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GeneratePage from './pages/GeneratePage'
import VideoPage from './pages/VideoPage'
import HistoryPage from './pages/HistoryPage'
import ProjectsPage from './pages/ProjectsPage'
import SpacesPage from './pages/SpacesPage'
import CollagePage from './pages/CollagePage'
import ImageTranslatorPage from './pages/ImageTranslatorPage'
import AdCreatorPage from './pages/AdCreatorPage'
import MockupPage from './pages/MockupPage'
import BgRemoverPage from './pages/BgRemoverPage'
import BrandKitPage from './pages/BrandKitPage'
import VoicePage from './pages/VoicePage'
import AdGeniusPage from './pages/AdGeniusPage'
import ChatPage from './pages/ChatPage'
import ImageEditPage from './pages/ImageEditPage'
import AvatarPage from './pages/AvatarPage'
import AdLibraryPage from './pages/AdLibraryPage'
import JewelleryPage from './pages/JewelleryPage'
import CommunityPage from './pages/CommunityPage'
import EditProfilePage from './pages/EditProfilePage'
import PricingPage from './pages/PricingPage'
import HomePage from './pages/HomePage'
import SOPPage from './pages/SOPPage'

// Import authStore so axios interceptors are registered on app load
import './store/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages (no sidebar) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* App pages (with sidebar layout) */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="pricing" element={<PricingPage />} />

          {/* Free tools */}
          <Route path="generate" element={<GeneratePage />} />
          <Route path="video" element={<VideoPage />} />
          <Route path="collage" element={<CollagePage />} />
          <Route path="voice" element={<VoicePage />} />
          <Route path="image-translator" element={<ImageTranslatorPage />} />
          <Route path="ad-library" element={<AdLibraryPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="bg-remover" element={<BgRemoverPage />} />
          <Route path="edit-profile" element={<EditProfilePage />} />

          {/* Free tools */}
          <Route path="chat" element={<ChatPage />} />
          <Route path="sop/:section" element={<SOPPage />} />

          {/* Pro tools */}
          <Route path="image-edit" element={<PlanGate minPlan="pro"><ImageEditPage /></PlanGate>} />
          <Route path="avatar" element={<PlanGate minPlan="pro"><AvatarPage /></PlanGate>} />
          <Route path="ad-genius" element={<PlanGate minPlan="pro"><AdGeniusPage /></PlanGate>} />
          <Route path="jewellery" element={<PlanGate minPlan="pro"><JewelleryPage /></PlanGate>} />
          <Route path="spaces" element={<PlanGate minPlan="pro"><SpacesPage /></PlanGate>} />

          {/* Enterprise tools */}
          <Route path="ad-creator" element={<PlanGate minPlan="enterprise"><AdCreatorPage /></PlanGate>} />
          <Route path="mockups" element={<PlanGate minPlan="enterprise"><MockupPage /></PlanGate>} />
          <Route path="brand-kit" element={<PlanGate minPlan="enterprise"><BrandKitPage /></PlanGate>} />
          <Route path="community" element={<PlanGate minPlan="enterprise"><CommunityPage /></PlanGate>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
