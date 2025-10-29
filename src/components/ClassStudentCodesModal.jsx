import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import StudentCodeCard from './StudentCodeCard';

export default function ClassStudentCodesModal({ open, onOpenChange, className, students }) {
  if (!students || students.length === 0) {
    return null;
  }

  const noCodeCount = students.filter(s => !s.studentCode).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            📚 {className} 학급 학생 코드 ({students.length}명)
            {noCodeCount > 0 && (
              <span className="ml-2 text-base font-normal text-yellow-600">
                ⚠️ 코드 없음: {noCodeCount}명
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            이 학급 학생들의 로그인 코드입니다.
          </DialogDescription>
        </DialogHeader>

        {/* 학생 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => (
            <StudentCodeCard key={student.id} student={student} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
