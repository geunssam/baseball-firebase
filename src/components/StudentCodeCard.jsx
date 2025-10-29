import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import toast from 'react-hot-toast';
import { useStudentAuth } from '../contexts/StudentAuthContext';

export default function StudentCodeCard({ student }) {
  const [copying, setCopying] = useState(false);
  const { loginWithStudentCode } = useStudentAuth();

  const handleViewPage = () => {
    if (!student.studentCode) {
      toast.error('학생 코드가 없습니다.');
      return;
    }
    loginWithStudentCode(student.studentCode);
  };

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
      <CardContent className="p-3">
        {student.studentCode ? (
          <div className="space-y-2">
            {/* 상단: 이름 + 버튼들 (가로 배치) */}
            <div className="flex items-center justify-between">
              {/* 이모지 + 이름 (좌측) */}
              <div className="flex items-center gap-1">
                <span className="text-lg">
                  {student.gender === 'male' ? '👨‍🎓' : student.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}
                </span>
                <span className="font-bold text-sm truncate">{student.name}</span>
              </div>

              {/* 버튼들 (우측 정렬) */}
              <div className="flex items-center gap-2">
                {/* 복사 버튼 */}
                <Button
                  onClick={handleCopy}
                  disabled={copying}
                  size="sm"
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700"
                >
                  {copying ? '복사 중...' : '📋 코드 복사'}
                </Button>

                {/* 페이지 보기 버튼 */}
                <Button
                  onClick={handleViewPage}
                  size="sm"
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700"
                >
                  👁️ 페이지 보기
                </Button>
              </div>
            </div>

            {/* 하단: 학생 코드 박스 (가로 한 줄) */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-600">학생코드</span>
              <span className="text-lg font-mono font-bold text-blue-600 select-all">
                {student.studentCode}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border-2 border-yellow-200 p-3 rounded-lg text-center">
            <div className="text-yellow-600 text-sm">⚠️ 코드 없음</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
