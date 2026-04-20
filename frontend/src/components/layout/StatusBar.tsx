import { useTracker } from '@/context/TrackerContext';

export const StatusBar = () => {
  // On récupère les infos directement du cerveau de l'app
  const { status, loading } = useTracker();

  return (
    <div className="bg-white border-l-4 border-blue-500 p-4 rounded-xl shadow-sm mb-10 font-mono text-sm flex items-center gap-4">
      <div className={`h-3 w-3 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-green-500'}`} />
      <span className="text-gray-500 italic">SYSTEM_STATUS:</span>
      <span className="font-bold text-gray-800">{status}</span>
    </div>
  );
};