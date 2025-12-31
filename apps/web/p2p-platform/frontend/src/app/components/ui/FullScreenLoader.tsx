const FullScreenLoader = () => {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-neutral-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );
};

export default FullScreenLoader;
