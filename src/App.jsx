import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import LocalSetup from './pages/LocalSetup.jsx';
import LocalGame from './pages/LocalGame.jsx';
import WordsManager from './pages/WordsManager.jsx';
import OnlineHome from './pages/OnlineHome.jsx';
import Room from './pages/Room.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/local" element={<LocalSetup />} />
      <Route path="/local/play" element={<LocalGame />} />
      <Route path="/mots" element={<WordsManager />} />
      <Route path="/online" element={<OnlineHome />} />
      <Route path="/online/salon/:code" element={<Room />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
