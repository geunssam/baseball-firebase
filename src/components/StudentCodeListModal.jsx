import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { ChevronDown, ChevronUp } from 'lucide-react';
import StudentCodeCard from './StudentCodeCard';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { generateStudentCode } from '../utils/studentCodeGenerator';
import toast from 'react-hot-toast';

export default function StudentCodeListModal({ open, onOpenChange }) {
  const { students, updateStudent } = useGame();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedClasses, setExpandedClasses] = useState({}); // 학급별 펼침 상태

  // 학급별로 학생 그룹화
  const studentsByClass = useMemo(() => {
    const grouped = {};
    students.forEach(student => {
      const className = student.className || '미분류';
      if (!grouped[className]) {
        grouped[className] = [];
      }
      grouped[className].push(student);
    });
    return grouped;
  }, [students]);

  // 코드 없는 학생 찾기
  const studentsWithoutCode = useMemo(() => {
    return students.filter(s => !s.studentCode);
  }, [students]);

  // 학급별 전체 코드 복사
  const handleCopyAllCodes = async (className) => {
    const classStudents = studentsByClass[className].filter(s => s.studentCode);

    if (classStudents.length === 0) {
      toast.error('복사할 코드가 없습니다.');
      return;
    }

    const codeList = classStudents
      .map(s => `${s.name}: ${s.studentCode}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(codeList);
      toast.success(
        <div>
          <div className="font-bold">✅ {className} 전체 코드 복사 완료!</div>
          <div className="text-sm">{classStudents.length}명</div>
        </div>,
        { duration: 3000 }
      );
    } catch (error) {
      toast.error('복사에 실패했습니다.');
    }
  };

  // 코드 일괄 생성
  const handleGenerateMissingCodes = async () => {
    if (!user?.uid) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (studentsWithoutCode.length === 0) {
      toast.error('생성할 코드가 없습니다.');
      return;
    }

    const confirmed = confirm(
      `${studentsWithoutCode.length}명의 학생에게 코드를 생성하시겠습니까?`
    );

    if (!confirmed) return;

    setGenerating(true);
    setProgress({ current: 0, total: studentsWithoutCode.length });

    try {
      for (let i = 0; i < studentsWithoutCode.length; i++) {
        const student = studentsWithoutCode[i];

        // 코드 생성
        const studentCode = generateStudentCode(user.uid, student.id);

        // Firestore 업데이트
        await updateStudent(student.id, { studentCode });

        // 진행률 업데이트
        setProgress({ current: i + 1, total: studentsWithoutCode.length });
      }

      toast.success(
        <div>
          <div className="font-bold">✅ 코드 생성 완료!</div>
          <div className="text-sm">{studentsWithoutCode.length}명</div>
        </div>,
        { duration: 4000 }
      );

    } catch (error) {
      console.error('코드 생성 실패:', error);
      toast.error('코드 생성에 실패했습니다: ' + error.message);
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">🔑 학생 로그인 코드 목록</DialogTitle>
          <DialogDescription>
            학생들이 자신의 통계를 확인할 때 사용하는 코드입니다.
          </DialogDescription>
        </DialogHeader>

        {/* 코드 없는 학생 경고 */}
        {studentsWithoutCode.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-yellow-800">
                    {studentsWithoutCode.length}명의 학생에게 코드가 없습니다.
                  </div>
                  <div className="text-sm text-yellow-700">
                    코드를 생성해야 학생들이 로그인할 수 있습니다.
                  </div>
                </div>
              </div>
              <Button
                onClick={handleGenerateMissingCodes}
                disabled={generating}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {generating
                  ? `생성 중... (${progress.current}/${progress.total})`
                  : '🔄 코드 일괄 생성'}
              </Button>
            </div>
          </Alert>
        )}

        {/* 학급별 학생 목록 */}
        <div className="space-y-4">
          {Object.keys(studentsByClass).sort().map(className => {
            const isExpanded = expandedClasses[className] !== false; // 기본값 true (펼침)

            return (
              <div key={className} className="border rounded-lg overflow-hidden">
                {/* 학급 헤더 (클릭 가능) */}
                <div className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors">
                  <button
                    onClick={() => {
                      setExpandedClasses(prev => ({
                        ...prev,
                        [className]: !isExpanded
                      }));
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                    <h3 className="text-lg font-bold">
                      📚 {className} ({studentsByClass[className].length}명)
                    </h3>
                  </button>

                  <Button
                    onClick={() => handleCopyAllCodes(className)}
                    variant="outline"
                    size="sm"
                  >
                    📋 전체 코드 복사
                  </Button>
                </div>

                {/* 학생 카드 그리드 (3열) - 펼쳐졌을 때만 표시 */}
                {isExpanded && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {studentsByClass[className].map(student => (
                        <StudentCodeCard key={student.id} student={student} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 학생이 없을 때 */}
          {students.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-6xl mb-4">👥</div>
              <div className="text-lg">등록된 학생이 없습니다.</div>
              <div className="text-sm mt-2">학급/팀 관리에서 학생을 추가해주세요.</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
