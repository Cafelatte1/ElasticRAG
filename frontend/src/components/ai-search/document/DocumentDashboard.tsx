export default function DocumentDashboard() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 문서 통계 카드들 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">총 문서</h3>
          {/* 통계 내용 */}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">처리 중</h3>
          {/* 통계 내용 */}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">완료</h3>
          {/* 통계 내용 */}
        </div>
      </div>
      
      {/* 추가적인 대시보드 내용 */}
    </div>
  );
} 