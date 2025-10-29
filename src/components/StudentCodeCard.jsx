import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import toast from 'react-hot-toast';

export default function StudentCodeCard({ student }) {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!student.studentCode) {
      toast.error('학생 코드가 없습니다.');
      return;
    }

    try {
      setCopying(true);
      await navigator.clipboard.writeText(student.studentCode);

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold">✅ 코드가 복사되었습니다!</span>
          <span className="text-sm">{student.name}: {student.studentCode}</span>
        </div>,
        {
          duration: 3000,
          position: 'top-right',
        }
      );
    } catch (error) {
      toast.error('복사에 실패했습니다.');
      console.error('Copy error:', error);
    } finally {
      setTimeout(() => setCopying(false), 500);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 학생 정보 */}
          <div className="text-center">
            <div className="text-2xl mb-1">👨‍🎓</div>
            <div className="font-bold text-base">{student.name}</div>
            <div className="text-xs text-muted-foreground">{student.className || '학급 정보 없음'}</div>
          </div>

          {/* 학생 코드 */}
          {student.studentCode ? (
            <>
              <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                <div className="text-xs text-gray-600 text-center mb-1">학생 로그인 코드</div>
                <div className="text-2xl font-mono font-bold text-center text-blue-600 select-all">
                  {student.studentCode}
                </div>
              </div>

              {/* 복사 버튼 */}
              <Button
                onClick={handleCopy}
                disabled={copying}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {copying ? '복사 중...' : '📋 코드 복사'}
              </Button>
            </>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 p-3 rounded-lg text-center">
              <div className="text-yellow-600 text-sm">⚠️ 코드 없음</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
