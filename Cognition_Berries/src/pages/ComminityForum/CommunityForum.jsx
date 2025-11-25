// src/pages/CommunityForum/CommunityForum.jsx
import { Routes, Route } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import ForumHome from './ForumHome';
import PostView from './PostView';
import './CommunityForum.css';

function CommunityForum() {
  return (
    <div className="community-forum-page">
      <Navbar />
      <main className="forum-container">
        <Routes>
          <Route index element={<ForumHome />} />
          <Route path="post/:postId" element={<PostView />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default CommunityForum;