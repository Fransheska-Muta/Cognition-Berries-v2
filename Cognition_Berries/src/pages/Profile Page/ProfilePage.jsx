// pages/ProfilePage.jsx
import React, { useState } from 'react';

const ProfilePage = () => {
  const [file, setFile] = useState(null);
  const Base_API = import.meta.env.VITE_BASE_API

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const res = await fetch(`${Base_API}/api/upload-profile`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        // update localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { ...user, avatar: data.imageUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Profile picture uploaded successfully!');
      } else {
        alert(data.message || 'Upload failed.');
      }
    } catch (error) {
      console.error(error);
      alert('Server error during upload.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Upload Profile Picture</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button type="submit">Upload</button>
      </form>
    </div>
  );
};

export default ProfilePage;
