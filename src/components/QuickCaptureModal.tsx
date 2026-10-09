import React, { useState, useRef, useEffect } from 'react';
import { ScreenshotNode, ClusterNode } from '../types/aura';
import { computeContentHash } from '../lib/storage';
import {
  X,
  Upload,
  Camera,
  Loader2,
  Mic,
  MicOff,
  Clock,
  Play,
  Pause,
  SwitchCamera,
  RotateCcw,
} from 'lucide-react';
import { calculateNextNodePosition } from '../lib/graphLayout';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clusters: ClusterNode[];
  screenshots?: ScreenshotNode[];
  onAddScreenshot: (node: ScreenshotNode) => void;
}

export const QuickCaptureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  clusters,
  screenshots = [],
  onAddScreenshot,
}) => {
  const [captureType, setCaptureType] = useState<'text' | 'voice' | 'camera' | 'upload'>('text');

  // Text Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [isReminder, setIsReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  // Image / Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filename, setFilename] = useState('');

  // Live Camera State
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }
    if (captureType === 'camera') {
      startCamera();
    } else {
      stopCameraStream();
    }
  }, [isOpen, captureType, cameraFacing]);

  const startCamera = async () => {
    stopCameraStream();
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setErrorMsg('Acesso à câmera indisponível ou negado.');
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
    setFilename(`foto_${Date.now()}.jpg`);
    stopCameraStream();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordDuration(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        const blobUrl = URL.createObjectURL(blob);
        setAudioBlobUrl(blobUrl);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result as string;
          setAudioBase64(b64);

          setIsTranscribing(true);
          try {
            const res = await fetch('/api/audio/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: b64, mimeType: 'audio/webm' }),
            });
            const data = await res.json();
            if (data.transcription) {
              setTranscribedText(data.transcription);
              const lower = data.transcription.toLowerCase();
              if (lower.includes('lembrar') || lower.includes('preciso') || lower.includes('amanhã')) {
                setIsReminder(true);
              }
            }
          } catch (e: any) {
            console.error('Transcription error:', e);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Microfone indisponível ou negado.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current && audioBlobUrl) {
      audioPlayerRef.current = new Audio(audioBlobUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (audioPlayerRef.current) {
      if (isPlayingAudio) {
        audioPlayerRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (captureType === 'text') {
        if (!noteBody.trim() && !noteTitle.trim()) {
          throw new Error('Preencha o título ou o conteúdo da nota.');
        }

        const analysisRes = await fetch('/api/note/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle,
            body: noteBody,
            itemType: 'text_note',
          }),
        });
        const analysisData = await analysisRes.json();
        const analysis = analysisData.analysis || {};

        const contentHash = await computeContentHash(`${noteTitle}:${noteBody}:${Date.now()}`);

        const targetCluster =
          clusters.find((c) =>
            c.name.toLowerCase().includes((analysis.suggestedCluster || '').toLowerCase())
          ) || clusters[0];

        const nodePos = calculateNextNodePosition(targetCluster.id, screenshots, clusters);

        const newNode: ScreenshotNode = {
          id: `node_note_${Date.now()}`,
          itemType: 'text_note',
          contentHash,
          vaultSourceId: 'local-photos',
          filename: noteTitle || analysis.suggestedTitle || 'Nota',
          timestamp: new Date().toISOString(),
          imageUrl: '',
          sourceApp: 'Nota de Texto',
          ocrText: noteBody,
          visualContext: {
            type: isReminder || analysis.isReminder ? 'reminder' : 'quick_note',
            confidence: 0.98,
            summary: analysis.summary || 'Anotação registrada.',
          },
          clusterId: targetCluster.id,
          tags: analysis.suggestedTags || ['nota'],
          isReminder: isReminder || analysis.isReminder || false,
          reminderDate: isReminder ? reminderDate : undefined,
          lgpdMasked: false,
          lgpdFindings: [],
          x: nodePos.x,
          y: nodePos.y,
        };

        onAddScreenshot(newNode);
        onClose();
      } else if (captureType === 'voice') {
        if (!transcribedText.trim() && !audioBase64) {
          throw new Error('Grave um áudio antes de salvar.');
        }

        const analysisRes = await fetch('/api/note/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Áudio: ${transcribedText.slice(0, 30)}`,
            body: transcribedText,
            itemType: 'voice_audio',
            audioDuration: recordDuration,
          }),
        });
        const analysisData = await analysisRes.json();
        const analysis = analysisData.analysis || {};

        const contentHash = await computeContentHash(audioBase64 || transcribedText);

        const targetCluster =
          clusters.find((c) =>
            c.name.toLowerCase().includes((analysis.suggestedCluster || '').toLowerCase())
          ) || clusters[0];

        const nodePos = calculateNextNodePosition(targetCluster.id, screenshots, clusters);

        const newNode: ScreenshotNode = {
          id: `node_voice_${Date.now()}`,
          itemType: 'voice_audio',
          contentHash,
          vaultSourceId: 'local-photos',
          filename: analysis.suggestedTitle || `Gravação (${recordDuration}s)`,
          timestamp: new Date().toISOString(),
          imageUrl: '',
          audioUrl: audioBase64 || audioBlobUrl || undefined,
          audioDuration: recordDuration,
          sourceApp: 'Áudio de Voz',
          ocrText: transcribedText,
          visualContext: {
            type: 'voice_memo',
            confidence: 0.95,
            summary: analysis.summary || transcribedText.slice(0, 80),
          },
          clusterId: targetCluster.id,
          tags: analysis.suggestedTags || ['audio', 'voz'],
          isReminder: isReminder || analysis.isReminder || false,
          reminderDate: isReminder ? reminderDate : undefined,
          lgpdMasked: false,
          lgpdFindings: [],
          x: nodePos.x,
          y: nodePos.y,
        };

        onAddScreenshot(newNode);
        onClose();
      } else {
        if (!selectedImage) {
          throw new Error('Selecione ou capture uma imagem.');
        }

        const contentHash = await computeContentHash(selectedImage);

        const res = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: selectedImage,
            filename: filename || 'captura.png',
          }),
        });

        if (!res.ok) throw new Error('Falha no motor de visão Gemini');

        const data = await res.json();
        const analysis = data.analysis || {};

        const targetCluster =
          clusters.find((c) =>
            c.name.toLowerCase().includes((analysis.suggestedCluster || '').toLowerCase())
          ) || clusters[0];

        const nodePos = calculateNextNodePosition(targetCluster.id, screenshots, clusters);

        const newNode: ScreenshotNode = {
          id: `node_user_${Date.now()}`,
          itemType: 'screenshot',
          contentHash,
          vaultSourceId: 'local-photos',
          filename: filename || analysis.title || 'Captura',
          timestamp: new Date().toISOString(),
          imageUrl: selectedImage,
          thumbnailUrl: selectedImage,
          sourceApp: captureType === 'camera' ? 'Câmera' : analysis.sourceApp || 'Galeria',
          ocrText: analysis.ocrText || 'Nenhum texto detectado.',
          visualContext: analysis.visualContext || {
            type: 'other',
            confidence: 0.92,
            summary: analysis.title || 'Captura analisada',
          },
          clusterId: targetCluster.id,
          tags: analysis.suggestedTags || ['screenshot'],
          lgpdMasked: analysis.isSensitive || false,
          lgpdFindings: analysis.lgpdFindings || [],
          x: nodePos.x,
          y: nodePos.y,
        };

        onAddScreenshot(newNode);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar item.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#090D18]/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-white tracking-tight">Nova Captura</h3>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Tabs */}
        <div className="flex items-center p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              setCaptureType('text');
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              captureType === 'text' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nota
          </button>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              setCaptureType('voice');
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              captureType === 'voice' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Áudio
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedImage(null);
              setCaptureType('camera');
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              captureType === 'camera' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Câmera
          </button>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              setCaptureType('upload');
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              captureType === 'upload' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload
          </button>
        </div>

        {/* Form Body */}
        {captureType === 'text' && (
          <div className="space-y-3">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Título ou ideia..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
            />
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={4}
              placeholder="Escreva seus pensamentos..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25 resize-none leading-relaxed font-sans"
            />
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReminder}
                  onChange={(e) => setIsReminder(e.target.checked)}
                  className="rounded"
                />
                <span>Lembrete</span>
              </label>
              {isReminder && (
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded px-2 py-0.5 text-xs text-white"
                />
              )}
            </div>
          </div>
        )}

        {captureType === 'voice' && (
          <div className="space-y-3 text-center py-2">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center space-y-2">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse"
                >
                  <MicOff className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-12 h-12 rounded-full bg-white text-black hover:bg-slate-200 flex items-center justify-center transition-all"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
              <span className="text-xs text-slate-400">
                {isRecording ? `Gravando (${recordDuration}s)... Toque para parar` : 'Toque para falar'}
              </span>
            </div>

            {audioBlobUrl && !isRecording && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className="px-3 py-1 rounded-lg text-xs bg-white/[0.05] text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  {isPlayingAudio ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>Ouvir ({recordDuration}s)</span>
                </button>
              </div>
            )}

            {transcribedText && (
              <textarea
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                rows={2}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />
            )}
          </div>
        )}

        {captureType === 'camera' && (
          <div className="space-y-3">
            {!selectedImage ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/[0.08]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
                  <div className="flex justify-end pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setCameraFacing((p) => (p === 'environment' ? 'user' : 'environment'))}
                      className="p-1.5 rounded-full bg-black/60 text-white"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-center pointer-events-auto">
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="w-12 h-12 rounded-full border-2 border-white bg-white/20 hover:bg-white/40 flex items-center justify-center"
                    >
                      <div className="w-8 h-8 rounded-full bg-white" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black max-h-48 border border-white/[0.08] flex items-center justify-center">
                <img src={selectedImage} alt="Foto" className="max-h-48 object-contain" />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    startCamera();
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-xs text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Repetir
                </button>
              </div>
            )}
          </div>
        )}

        {captureType === 'upload' && (
          <div className="space-y-3">
            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/[0.15] hover:border-white/40 rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-300">Escolha uma imagem</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black max-h-44 border border-white/[0.08] flex items-center justify-center">
                <img src={selectedImage} alt="Preview" className="max-h-44 object-contain" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-rose-400 py-1">
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isProcessing ||
              isRecording ||
              ((captureType === 'camera' || captureType === 'upload') && !selectedImage)
            }
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>Adicionar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
