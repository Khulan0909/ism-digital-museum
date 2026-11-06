import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Exhibits from './pages/Exhibits'
import ExhibitDetail from './pages/ExhibitDetail'
import ExhibitForm from './pages/ExhibitForm'
import Teachers from './pages/Teachers'
import TeacherDetail from './pages/TeacherDetail'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import TimeMachine from './pages/TimeMachine'
import Gallery from './pages/Gallery'
import Creators from './pages/Creators'
import CreatorDetail from './pages/CreatorDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route path="exhibits" element={<Exhibits />} />
        <Route path="exhibits/new" element={<ProtectedRoute><ExhibitForm /></ProtectedRoute>} />
        <Route path="exhibits/:id" element={<ExhibitDetail />} />
        <Route path="exhibits/:id/edit" element={<ProtectedRoute><ExhibitForm /></ProtectedRoute>} />

        <Route path="teachers" element={<Teachers />} />
        <Route path="teachers/:id" element={<TeacherDetail />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="history" element={<TimeMachine />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="creators" element={<Creators />} />
        <Route path="creators/:id" element={<CreatorDetail />} />

        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
