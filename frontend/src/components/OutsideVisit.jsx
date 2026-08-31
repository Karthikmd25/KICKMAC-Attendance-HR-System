import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

const REASONS = [
  { value: 'CLIENT_MEETING', label: 'Client Meeting' },
  { value: 'BANK_WORK', label: 'Bank Work' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'OFFICIAL_WORK', label: 'Official Work' },
  { value: 'OTHER', label: 'Other' },
];

const getErrorMessage = (error) => error.response?.data?.message
  || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server.' : 'Something went wrong. Please try again.');

const statusClass = (status) => {
  switch (status) {
    case 'APPROVED': return 'status-approved';
    case 'REJECTED': return 'status-rejected';
    default: return 'status-pending';
  }
};

const reasonLabel = (value) => REASONS.find((r) => r.value === value)?.label || value;

export default function OutsideVisit({ visits, loading, onSubmitted, setMessage }) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('CLIENT_MEETING');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Unable to access camera: ' + error.message });
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play();
        setCameraReady(true);
      };
    }
  }, [cameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!video.videoWidth || !video.videoHeight) {
      setMessage({ type: 'error', text: 'Camera is still loading. Please wait a moment and try again.' });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setPhoto(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const getPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Unable to get your current location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(error.code === 1
        ? 'Location permission is required.'
        : 'Unable to get your current location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });

  const closeForm = () => {
    stopCamera();
    setShowForm(false);
    setPhoto(null);
    setReason('CLIENT_MEETING');
    setNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photo) {
      setMessage({ type: 'error', text: 'A photo is required to log an outside visit.' });
      return;
    }

    setSubmitting(true);
    setGettingLocation(true);
    setMessage({ type: '', text: '' });
    try {
      const { latitude, longitude } = await getPosition();
      setGettingLocation(false);

      await api.post('/outside-visit', { latitude, longitude, reason, notes, photo });
      setMessage({ type: 'success', text: 'Outside office visit logged' });
      closeForm();
      onSubmitted();
    } catch (error) {
      setMessage({ type: 'error', text: error.message?.includes('location') || error.message?.includes('Location')
        ? error.message : getErrorMessage(error) });
    } finally {
      setSubmitting(false);
      setGettingLocation(false);
    }
  };

  return (
    <>
      <section className="outside-visit-card attendance-card">
        <div className="card-heading">
          <div><p className="eyebrow">Field visits</p><h2>Outside Office</h2></div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Go outside</button>
        </div>
        {loading ? (
          <p className="calendar-loading">Loading visits...</p>
        ) : visits.length === 0 ? (
          <p className="empty-note">No outside visits logged yet.</p>
        ) : (
          <div className="request-list">
            {visits.map((v) => (
              <div key={v._id} className="request-row">
                <div className="request-main outside-visit-row">
                  {v.photo && <img src={v.photo} alt="Visit" className="visit-thumb" />}
                  <div>
                    <strong>{reasonLabel(v.reason)}</strong>
                    <span>{new Date(v.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {v.notes && <span className="request-reason">{v.notes}</span>}
                  </div>
                </div>
                <span className={`status-pill ${statusClass(v.status)}`}>{v.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="outside-visit-title">
          <div className="verification-modal-card">
            <button className="modal-close" aria-label="Close" onClick={closeForm}>×</button>
            <p className="eyebrow">New entry</p>
            <h2 id="outside-visit-title">Outside office visit</h2>

            <form onSubmit={handleSubmit} className="permission-form">
              <div className="form-group">
                <label>Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details"
                />
              </div>

              <div className="form-group">
                <label>Photo (required)</label>
                <div className="camera-box">
                  {!cameraActive && !photo && (
                    <button type="button" className="btn-secondary" onClick={startCamera}>
                      📷 Open camera
                    </button>
                  )}

                  {cameraActive && (
                    <div className="camera-preview">
                      <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                      {!cameraReady && <p className="calendar-loading">Starting camera...</p>}
                      <div className="camera-controls">
                        <button type="button" className="btn-primary gps-button" onClick={capturePhoto} disabled={!cameraReady}>Capture</button>
                        <button type="button" className="btn-secondary" onClick={stopCamera}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {photo && (
                    <div className="camera-preview">
                      <img src={photo} alt="Captured" className="camera-video" />
                      <div className="camera-controls">
                        <button type="button" className="btn-secondary" onClick={retakePhoto}>Retake</button>
                      </div>
                    </div>
                  )}

                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary gps-button" disabled={submitting || !photo}>
                <span>◎</span>
                {gettingLocation ? 'Getting your location...' : submitting ? 'Submitting...' : 'Submit visit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}