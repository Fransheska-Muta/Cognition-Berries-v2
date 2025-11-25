// src/components/admin/AdminCourseImageManager.jsx
import React, { useState, useEffect } from 'react';
import { Upload, X, Eye, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../utils/api';

/**
 * Admin Course Image Manager
 * Allows admins to upload, preview, replace, and delete course images
 */
const AdminCourseImageManager = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/courses');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      showMessage('error', 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      showMessage('error', 'Invalid file type. Please select PNG, JPEG, GIF, or WebP');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      showMessage('error', 'File too large. Maximum size is 5MB');
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!selectedCourse || !file) {
      showMessage('error', 'Please select a course and an image');
      return;
    }

    try {
      setUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;

        try {
          const response = await apiRequest(`/courses/${selectedCourse._id || selectedCourse.course_id}`, {
            method: 'POST',
            body: JSON.stringify({
              image: base64Data,
              filename: file.name
            })
          });

          const result = await response.json();

          if (response.ok) {
            showMessage('success', `Image uploaded successfully (${result.size})`);
            setFile(null);
            setPreview(null);
            await fetchCourses(); // Refresh course list
          } else {
            showMessage('error', result.error || 'Upload failed');
          }
        } catch (error) {
          console.error('Upload error:', error);
          showMessage('error', 'Failed to upload image');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      showMessage('error', 'Failed to upload image');
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;

    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await apiRequest(
        `/courses/${selectedCourse._id || selectedCourse.course_id}/image`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        showMessage('success', 'Image deleted successfully');
        setPreview(null);
        setFile(null);
        await fetchCourses();
      } else {
        const result = await response.json();
        showMessage('error', result.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('error', 'Failed to delete image');
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Image Manager</h2>

      {/* Message Toast */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Course Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Course
        </label>
        <select
          value={selectedCourse?._id || ''}
          onChange={(e) => {
            const course = courses.find(c => c._id === e.target.value);
            setSelectedCourse(course);
            // Load existing image if available
            if (course?.imageData?.data) {
              setPreview(course.imageData.data);
            } else {
              setPreview(null);
            }
            setFile(null);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a course --</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title || course.course_name}
              {course.imageData ? ' (has image)' : ' (no image)'}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          {/* File Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Image
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="w-5 h-5 mr-2" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {file && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <button
                    onClick={clearSelection}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Max size: 5MB. Formats: PNG, JPEG, GIF, WebP
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-md max-h-64 rounded-lg border border-gray-300"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
            </button>

            {selectedCourse.imageData && (
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Current Image</span>
              </button>
            )}
          </div>

          {/* Course Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Course Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>ID:</strong> {selectedCourse._id}</p>
              <p><strong>Title:</strong> {selectedCourse.title || selectedCourse.course_name}</p>
              <p><strong>Current Image:</strong> {selectedCourse.imageData ? 'Yes' : 'No'}</p>
              {selectedCourse.imageUrl && (
                <p><strong>Image URL:</strong> {selectedCourse.imageUrl}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCourseImageManager;