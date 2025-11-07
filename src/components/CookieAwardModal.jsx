/**
 * CookieAwardModal.jsx
 * 교사가 학생에게 쿠키를 수여할 때 사용하는 모달
 * - 학생 선택
 * - 쿠키 수량 입력
 * - 메모 입력 (필수, 단 "이유없음" 버튼으로 빠르게 입력 가능)
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function CookieAwardModal({
  open,
  onOpenChange,
  students,
  onAwardCookie,
  preSelectedStudent = null // 경기 화면에서 이미 선택된 학생 정보
}) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [cookieAmount, setCookieAmount] = useState(1);
  const [memo, setMemo] = useState('');

  // 모달이 열릴 때 preSelectedStudent가 있으면 자동 선택
  useEffect(() => {
    if (open) {
      // 모달이 열릴 때만 초기화 (한 번만)
      if (preSelectedStudent) {
        setSelectedStudent(preSelectedStudent.id);
      } else {
        setSelectedStudent('');
      }
      setCookieAmount(1);
      setMemo('');
    } else {
      // 모달이 닫힐 때 초기화
      setSelectedStudent('');
      setCookieAmount(1);
      setMemo('');
    }
  }, [open]); // preSelectedStudent 의존성 제거 - 모달 열릴 때만 체크

  const handleSubmit = () => {
    if (!selectedStudent) {
      alert('학생을 선택해주세요.');
      return;
    }

    if (!cookieAmount || cookieAmount <= 0) {
      alert('쿠키 수량을 1개 이상 입력해주세요.');
      return;
    }

    if (!memo.trim()) {
      alert('메모를 입력해주세요.\n(빠른 입력: "이유없음" 버튼 클릭)');
      return;
    }

    // 선택된 학생 정보 찾기
    const student = students.find(s => s.id === selectedStudent);

    onAwardCookie({
      studentId: selectedStudent,
      studentName: student?.name || '알 수 없음',
      className: student?.className || '알 수 없음',
      classNumber: student?.number || 0,
      amount: cookieAmount,
      memo: memo.trim(),
      awardedAt: new Date().toISOString()
    });

    onOpenChange(false);
  };

  const handleNoReasonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMemo('이유 없음');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>🍪 쿠키 수여</DialogTitle>
          <DialogDescription>
            학생에게 쿠키를 수여하고 이유를 기록하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 학생 선택 (preSelectedStudent가 없을 때만 표시) */}
          {!preSelectedStudent && (
            <div className="space-y-2">
              <Label htmlFor="student-select">학생 선택</Label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="학생을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.className} {student.number}번 {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* preSelectedStudent가 있을 때 학생 정보 표시 */}
          {preSelectedStudent && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-semibold mb-1">수여 대상</p>
              <p className="text-lg font-bold text-blue-900">
                {preSelectedStudent.className} {preSelectedStudent.number}번 {preSelectedStudent.name}
              </p>
            </div>
          )}

          {/* 쿠키 수량 */}
          <div className="space-y-2">
            <Label htmlFor="cookie-amount">쿠키 수량</Label>
            <Input
              id="cookie-amount"
              type="number"
              min="1"
              max="100"
              value={cookieAmount}
              onChange={(e) => setCookieAmount(parseInt(e.target.value) || 1)}
              className="w-full"
            />
          </div>

          {/* 메모 입력 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="memo">수여 이유 (필수)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNoReasonClick}
                className="h-7 text-xs"
              >
                이유없음
              </Button>
            </div>
            <Textarea
              id="memo"
              placeholder="예: 수업 중 적극적인 참여, 친구 도와주기 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {memo.length}/200
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button onClick={handleSubmit}>
            🍪 수여하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
