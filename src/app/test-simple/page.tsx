export default function TestSimple() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Simple Test Page</h1>
        <p className="text-lg text-gray-600">If you can see this, the server is working correctly.</p>
        <div className="mt-8">
          <a href="/" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
            Go Back Home
          </a>
        </div>
      </div>
    </div>
  );
}