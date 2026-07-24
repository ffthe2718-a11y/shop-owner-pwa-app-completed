import { useState, useRef } from 'react';
import { ArrowLeft, Upload, Trash2, Image as ImageIcon, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import Toast from '../components/Toast';

export default function Gallery() {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState([
    { id: 1, url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80', cover: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=400&q=80', cover: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1516975080661-460d3d578eb7?auto=format&fit=crop&w=400&q=80', cover: false },
  ]);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newUrl = URL.createObjectURL(e.target.files[0]);
      setImages([...images, { id: Date.now(), url: newUrl, cover: false }]);
      showToast('Image uploaded successfully');
    }
  };

  const setCover = (id: number) => {
    setImages(images.map(img => ({...img, cover: img.id === id})));
    showToast('Cover image updated');
  };

  const deleteImg = (id: number) => {
    setImages(images.filter(img => img.id !== id));
    showToast('Image deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/app/owner/website" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Photo Gallery</h1>
            <p className="text-slate-500 mt-1">{images.length}/10 photos uploaded</p>
          </div>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="w-5 h-5" /> Upload Photo
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map(img => (
          <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-200 shadow-sm bg-slate-100">
            <img src={img.url} alt="Gallery item" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
              <div className="flex justify-end">
                <button onClick={() => deleteImg(img.id)} className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => setCover(img.id)} className={`py-1.5 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${img.cover ? 'bg-amber-500 text-white' : 'bg-white/20 text-white hover:bg-white/40 backdrop-blur-sm'}`}>
                <Star className={`w-3.5 h-3.5 ${img.cover ? 'fill-current' : ''}`} /> {img.cover ? 'Cover Photo' : 'Set as Cover'}
              </button>
            </div>
            {img.cover && (
              <div className="absolute top-3 left-3 bg-amber-500 text-white p-1 rounded-full shadow-sm">
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
          </div>
        ))}
        
        {images.length < 10 && (
          <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center transition-colors">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Add Photo</span>
          </button>
        )}
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}