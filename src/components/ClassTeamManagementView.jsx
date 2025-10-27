import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { DndContext, closestCenter, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteConfirmModal from './DeleteConfirmModal';

/**
 * SortablePlayerRow
 * 드래그 가능한 선수 행
 */
const SortablePlayerRow = ({ player, index, isTeamEditMode, positions, onChangePosition, onRemove }) => {
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customPosition, setCustomPosition] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: player.id || player.name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { pointerEvents: 'none' } : {}),
  };

  // "직접입력"이 아닌 다른 포지션이 선택되어 있으면 커스텀 입력 모드 해제
  useEffect(() => {
    if (player.position && player.position !== '직접입력' && !positions.includes(player.position)) {
      // 커스텀 포지션이 이미 입력된 상태
      setIsCustomInput(false);
    } else if (player.position === '직접입력') {
      setIsCustomInput(true);
    }
  }, [player.position, positions]);

  const handlePositionChange = (value) => {
    if (value === '직접입력') {
      setIsCustomInput(true);
      setCustomPosition('');
    } else {
      setIsCustomInput(false);
      onChangePosition(index, value);
    }
  };

  const handleCustomPositionSubmit = () => {
    if (customPosition.trim()) {
      onChangePosition(index, customPosition.trim());
      setIsCustomInput(false);
      setCustomPosition('');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-3 items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors group bg-background ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <div className="col-span-1 flex items-center justify-center">
        <span
          {...attributes}
          {...listeners}
          className="cursor-move text-muted-foreground hover:text-foreground text-xl"
        >
          ⠿
        </span>
      </div>

      {/* 타순 */}
      <div className="col-span-2 flex items-center justify-center">
        <div className="inline-flex items-center justify-center bg-slate-100 text-black px-4 py-2 rounded-full font-bold text-xl border-2 border-slate-300">
          {player.battingOrder || index + 1}번
        </div>
      </div>

      {/* 이름 + 학년-반 배지 */}
      <div className="col-span-4 flex items-center gap-2">
        <span className="font-bold text-base">{player.name}</span>
        {player.className && (
          <Badge variant="outline" className="text-xs bg-muted">
            {player.className}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">#{player.number || index + 1}</span>
      </div>

      {/* 포지션 드롭박스 또는 직접입력 */}
      <div className="col-span-3">
        {isCustomInput ? (
          <div className="flex gap-1">
            <Input
              placeholder="포지션 입력"
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomPositionSubmit()}
              className="h-9 text-sm flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCustomPositionSubmit}
              className="h-9 px-2"
            >
              ✓
            </Button>
          </div>
        ) : (
          <Select value={player.position || ''} onValueChange={handlePositionChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="포지션 선택" />
            </SelectTrigger>
            <SelectContent>
              {positions.map((pos) => (
                <SelectItem key={pos} value={pos} className="text-sm">
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 학급 (삭제 예정) */}
      <div className="col-span-1"></div>

      {/* 삭제 버튼 (편집 모드에서만) */}
      <div className="col-span-1 flex justify-end">
        {isTeamEditMode && (
          <button
            onClick={() => onRemove(index)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded transition-colors"
            title="팀에서 제거"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * SortablePlayerRowForNewTeam
 * 새 팀 생성 시 선수 목록 드래그 가능한 행 (타순 표시, 포지션 드롭다운)
 */
const SortablePlayerRowForNewTeam = ({ player, index, autoPosition, currentPosition, onPositionChange, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: player.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { pointerEvents: 'none' } : {}),
  };

  const POSITIONS_FOR_NEW_TEAM = ['포수', '1루수', '2루수', '3루수', '자유수비', '외야수'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        grid grid-cols-12 gap-2 items-center p-2 border rounded-lg
        ${isDragging ? 'opacity-50 shadow-lg z-50' : 'bg-card'}
      `}
    >
      {/* 드래그 핸들 */}
      <div className="col-span-1 flex justify-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* 타순 */}
      <div className="col-span-1 text-center">
        <span className="text-sm font-bold text-primary">
          {index + 1}
        </span>
      </div>

      {/* 이름 */}
      <div className="col-span-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-sm">{player.name}</span>
          {player.className && (
            <Badge variant="outline" className="text-xs bg-muted w-fit">
              {player.className}
            </Badge>
          )}
        </div>
      </div>

      {/* 포지션 드롭다운 */}
      <div className="col-span-6">
        <Select
          value={currentPosition || autoPosition}
          onValueChange={(value) => onPositionChange(player.id, value)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="포지션 선택" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS_FOR_NEW_TEAM.map((pos) => (
              <SelectItem key={pos} value={pos} className="text-sm">
                {pos}
                {pos === autoPosition && !currentPosition && (
                  <span className="ml-2 text-xs text-muted-foreground">(자동)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 삭제 버튼 */}
      <div className="col-span-1 flex justify-end">
        <button
          onClick={onRemove}
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded transition-colors"
          title="선택 해제"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * ClassTeamManagementView
 *
 * 학급/팀 관리 메인 뷰
 * - 좌측 (30%): 학급 관리 (아코디언, 5열 그리드)
 * - 우측 (70%): 팀 관리 (4개 카드 표시, 인라인 편집)
 */
export default function ClassTeamManagementView() {
  const { user } = useAuth();
  const { students, teams, createStudent, updateStudent, deleteStudent, createTeam, updateTeam, deleteTeam } = useGame();

  // ============================================
  // 상태 관리
  // ============================================
  const [selectedClass, setSelectedClass] = useState(null); // 펼쳐진 학급
  const [selectedStudents, setSelectedStudents] = useState([]); // 선택된 학생들
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0); // 현재 표시 중인 팀 인덱스 (4개씩)
  const [badgeVisible, setBadgeVisible] = useState(true); // 배지 ON/OFF
  const [selectedTeam, setSelectedTeam] = useState(null); // 선택된 팀 (상세 보기)

  // 편집 모드
  const [isClassEditMode, setIsClassEditMode] = useState(false); // 학급 편집 모드
  const [isTeamEditMode, setIsTeamEditMode] = useState(false); // 팀 편집 모드

  // 새 학급 추가 모달
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // 학급별 학생 일괄 추가 모달
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [targetClass, setTargetClass] = useState(''); // 학생을 추가할 학급
  const [bulkStudentNames, setBulkStudentNames] = useState(''); // 일괄 입력 텍스트

  // 새 팀 추가 모달
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGrade, setNewTeamGrade] = useState('');
  const [newTeamClassNum, setNewTeamClassNum] = useState('');
  const [useGradeAsName, setUseGradeAsName] = useState(false);
  const [isAddingTeam, setIsAddingTeam] = useState(false); // 팀 추가 중복 방지

  // 새 팀 추가 - 2단계 (선수 선택)
  const [showAddTeamStep2Modal, setShowAddTeamStep2Modal] = useState(false);
  const [newTeamInfo, setNewTeamInfo] = useState(null); // { name, grade, classNum }
  const [selectedPlayersForNewTeam, setSelectedPlayersForNewTeam] = useState([]);
  const [expandedClasses, setExpandedClasses] = useState({}); // 학급 펼침 상태
  const [playerPositions, setPlayerPositions] = useState({}); // { playerId: position }

  // 학급에서 선수 가져오기 모달
  const [showImportPlayersModal, setShowImportPlayersModal] = useState(false);
  const [selectedPlayersForTeam, setSelectedPlayersForTeam] = useState([]);

  // 드래그 앤 드롭 상태
  const [activeId, setActiveId] = useState(null);

  // 새 선수 추가 모달
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  // 삭제 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'student' | 'class', data: {...}, deletedItems: [...] }
  const [isDeleting, setIsDeleting] = useState(false);

  // ============================================
  // 학급별 학생 그룹화
  // ============================================
  const studentsByClass = students.reduce((acc, student) => {
    const className = student.className || '미지정';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {});

  // 학급 이름을 생성 순서대로 정렬 (각 학급의 첫 번째 학생 생성 시간 기준)
  const classNames = Object.keys(studentsByClass).sort((a, b) => {
    const firstStudentA = studentsByClass[a][0];
    const firstStudentB = studentsByClass[b][0];

    // createdAt이 없는 경우 대비
    if (!firstStudentA?.createdAt || !firstStudentB?.createdAt) {
      return a.localeCompare(b); // 이름순 정렬
    }

    // Firestore Timestamp 비교
    const timeA = firstStudentA.createdAt.toMillis ? firstStudentA.createdAt.toMillis() : firstStudentA.createdAt;
    const timeB = firstStudentB.createdAt.toMillis ? firstStudentB.createdAt.toMillis() : firstStudentB.createdAt;

    return timeA - timeB;
  });

  // ============================================
  // selectedTeam 자동 동기화
  // ============================================
  // teams가 업데이트되면 selectedTeam도 최신 데이터로 동기화
  useEffect(() => {
    console.log('🔍 [ClassTeamManagement] useEffect 실행 - teams 변경됨');
    if (selectedTeam) {
      console.log('🔍 현재 selectedTeam:', selectedTeam.name, selectedTeam.id);
      const updatedTeam = teams.find(t => t.id === selectedTeam.id);
      if (updatedTeam) {
        console.log('🔄 selectedTeam 동기화:', updatedTeam.name);
        console.log('  이전 players:', selectedTeam.players?.map(p => p.name));
        console.log('  새로운 players:', updatedTeam.players?.map(p => p.name));
        console.log('  이전 battingOrder:', selectedTeam.players?.map(p => p.battingOrder));
        console.log('  새로운 battingOrder:', updatedTeam.players?.map(p => p.battingOrder));
        setSelectedTeam(updatedTeam);
      } else {
        console.log('⚠️ teams에서 selectedTeam을 찾을 수 없음!');
      }
    } else {
      console.log('ℹ️ selectedTeam이 없음 (아직 선택 안 함)');
    }
  }, [teams]);

  // ============================================
  // 팀 네비게이션
  // ============================================
  const TEAMS_PER_PAGE = 4;
  const totalPages = Math.ceil(teams.length / TEAMS_PER_PAGE);
  const visibleTeams = teams.slice(
    currentTeamIndex,
    currentTeamIndex + TEAMS_PER_PAGE
  );

  const handlePrevTeams = () => {
    if (currentTeamIndex > 0) {
      setCurrentTeamIndex(currentTeamIndex - TEAMS_PER_PAGE);
    }
  };

  const handleNextTeams = () => {
    if (currentTeamIndex + TEAMS_PER_PAGE < teams.length) {
      setCurrentTeamIndex(currentTeamIndex + TEAMS_PER_PAGE);
    }
  };

  // ============================================
  // 학생 선택 토글
  // ============================================
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // ============================================
  // 학급 아코디언 토글
  // ============================================
  const toggleClass = (className) => {
    setSelectedClass(selectedClass === className ? null : className);
  };

  // ============================================
  // 새 학급 추가
  // ============================================
  const handleAddClass = async () => {
    if (!newClassName.trim()) {
      alert('학급 이름을 입력하세요.');
      return;
    }

    // 학급은 students collection에 첫 번째 학생을 추가할 때 자동 생성됨
    // 여기서는 학급 이름만 저장하고 학생 추가 모달을 바로 띄움
    setTargetClass(newClassName);
    setNewClassName('');
    setShowAddClassModal(false);
    setShowAddStudentsModal(true);
  };

  // ============================================
  // 학급별 학생 일괄 추가
  // ============================================
  const handleAddStudentsBulk = async () => {
    if (!bulkStudentNames.trim()) {
      alert('학생 이름을 입력하세요.');
      return;
    }

    try {
      // 줄바꿈과 쉼표로 분리
      const names = bulkStudentNames
        .split(/[\n,]/)
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (names.length === 0) {
        alert('유효한 학생 이름이 없습니다.');
        return;
      }

      // 모든 학생을 순차적으로 추가
      for (const name of names) {
        await createStudent({
          name,
          className: targetClass,
        });
      }

      setBulkStudentNames('');
      setShowAddStudentsModal(false);
      setTargetClass('');
    } catch (error) {
      alert('학생 추가에 실패했습니다: ' + error.message);
    }
  };

  // 특정 학급에 학생 추가 모달 열기
  const handleOpenAddStudents = (className) => {
    setTargetClass(className);
    setShowAddStudentsModal(true);
  };

  // ============================================
  // 새 팀 추가 - Step 1: 팀 정보 입력
  // ============================================
  const handleAddTeamStep1 = () => {
    // 팀 이름 자동 생성 옵션이 켜져 있으면 학년/반으로 이름 생성
    let finalTeamName = newTeamName.trim();

    if (useGradeAsName) {
      if (!newTeamGrade || !newTeamClassNum) {
        alert('학년과 반을 입력하세요.');
        return;
      }
      finalTeamName = `${newTeamGrade}학년 ${newTeamClassNum}반`;
    } else {
      if (!finalTeamName) {
        alert('팀 이름을 입력하세요.');
        return;
      }
    }

    // 팀 정보 저장하고 2단계로 이동
    setNewTeamInfo({
      name: finalTeamName,
      grade: newTeamGrade || null,
      classNum: newTeamClassNum || null,
    });
    setShowAddTeamModal(false);
    setShowAddTeamStep2Modal(true);
    setSelectedPlayersForNewTeam([]);
  };

  // ============================================
  // 새 팀 추가 - Step 2: 선수 선택 및 팀 생성
  // ============================================
  const handleAddTeamStep2Complete = async () => {
    if (selectedPlayersForNewTeam.length === 0) {
      const confirmed = confirm('선수를 선택하지 않았습니다.\n\n선수 없이 팀을 생성하시겠습니까?');
      if (!confirmed) return;
    }

    try {
      setIsAddingTeam(true);

      // 선수들의 타순과 포지션 생성 (수동 선택 우선, 없으면 자동 배정)
      const POSITIONS = ['포수', '1루수', '2루수', '3루수', '자유수비', '외야수'];
      const players = selectedPlayersForNewTeam.map((student, index) => ({
        id: student.id,
        name: student.name,
        className: student.className,
        number: index + 1,
        battingOrder: index + 1,
        // 사용자가 선택한 포지션이 있으면 사용, 없으면 자동 배정
        position: playerPositions[student.id] || POSITIONS[index % POSITIONS.length],
      }));

      await createTeam({
        name: newTeamInfo.name,
        grade: newTeamInfo.grade,
        classNum: newTeamInfo.classNum,
        players: players,
        createdBy: user?.displayName || '익명',
      });

      // 초기화
      setNewTeamName('');
      setNewTeamGrade('');
      setNewTeamClassNum('');
      setUseGradeAsName(false);
      setNewTeamInfo(null);
      setSelectedPlayersForNewTeam([]);
      setPlayerPositions({});
      setShowAddTeamStep2Modal(false);

      alert(`✅ "${newTeamInfo.name}" 팀이 ${players.length}명의 선수와 함께 생성되었습니다!`);
    } catch (error) {
      alert('팀 추가에 실패했습니다: ' + error.message);
    } finally {
      setIsAddingTeam(false);
    }
  };

  // 새 팀 추가 취소
  const handleCancelAddTeam = () => {
    setSelectedPlayersForNewTeam([]);
    setPlayerPositions({});
    setShowAddTeamStep2Modal(false);
    setShowAddTeamModal(true);
  };

  // ============================================
  // 학급에서 선수 가져오기
  // ============================================
  const handleOpenImportPlayers = () => {
    if (!selectedTeam) {
      alert('팀을 먼저 선택하세요.');
      return;
    }
    setSelectedPlayersForTeam([]);
    setShowImportPlayersModal(true);
  };

  const togglePlayerSelection = (student) => {
    setSelectedPlayersForTeam((prev) => {
      const exists = prev.find((p) => p.id === student.id);
      if (exists) {
        return prev.filter((p) => p.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // 학급별 전체 선택/해제
  const toggleClassSelection = (className) => {
    const studentsInClass = studentsByClass[className];
    const availableStudents = studentsInClass.filter(
      (student) => !selectedTeam?.players?.some((p) => p.id === student.id)
    );

    const allSelected = availableStudents.every((student) =>
      selectedPlayersForTeam.some((p) => p.id === student.id)
    );

    if (allSelected) {
      // 해제
      setSelectedPlayersForTeam((prev) =>
        prev.filter((p) => !availableStudents.some((s) => s.id === p.id))
      );
    } else {
      // 선택
      setSelectedPlayersForTeam((prev) => {
        const newSelections = availableStudents.filter(
          (s) => !prev.some((p) => p.id === s.id)
        );
        return [...prev, ...newSelections];
      });
    }
  };

  // 전체 선택/해제
  const toggleAllSelection = () => {
    const allAvailableStudents = students.filter(
      (student) => !selectedTeam?.players?.some((p) => p.id === student.id)
    );

    const allSelected = allAvailableStudents.every((student) =>
      selectedPlayersForTeam.some((p) => p.id === student.id)
    );

    if (allSelected) {
      setSelectedPlayersForTeam([]);
    } else {
      setSelectedPlayersForTeam(allAvailableStudents);
    }
  };

  const handleImportPlayers = async () => {
    if (selectedPlayersForTeam.length === 0) {
      alert('선수를 선택하세요.');
      return;
    }

    try {
      const currentPlayers = selectedTeam.players || [];
      const newPlayers = selectedPlayersForTeam.map((student, index) => ({
        id: student.id,
        name: student.name,
        className: student.className,
        number: currentPlayers.length + index + 1,
      }));

      await updateTeam(selectedTeam.id, {
        players: [...currentPlayers, ...newPlayers],
      });

      setSelectedPlayersForTeam([]);
      setShowImportPlayersModal(false);
    } catch (error) {
      alert('선수 추가에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 새 선수 직접 추가
  // ============================================
  const handleOpenAddPlayer = () => {
    if (!selectedTeam) {
      alert('팀을 먼저 선택하세요.');
      return;
    }
    setNewPlayerName('');
    setShowAddPlayerModal(true);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('선수 이름을 입력하세요.');
      return;
    }

    try {
      const currentPlayers = selectedTeam.players || [];
      const newPlayer = {
        id: `temp_${Date.now()}`, // 임시 ID
        name: newPlayerName.trim(),
        className: null,
        number: currentPlayers.length + 1,
      };

      await updateTeam(selectedTeam.id, {
        players: [...currentPlayers, newPlayer],
      });

      setNewPlayerName('');
      setShowAddPlayerModal(false);
    } catch (error) {
      alert('선수 추가에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 학급 삭제
  // ============================================
  const handleOpenDeleteClass = (className) => {
    const studentsInClass = studentsByClass[className] || [];
    const studentCount = studentsInClass.length;

    const deletedItems = [
      `학급 정보 (${className})`,
      studentCount > 0 && `학생 ${studentCount}명의 모든 정보`,
      studentCount > 0 && '학생들의 모든 경기 기록',
      studentCount > 0 && '학생들의 모든 배지',
      studentCount > 0 && '팀 명단에서 자동 제거'
    ].filter(Boolean);

    setDeleteTarget({
      type: 'class',
      data: { className },
      deletedItems
    });
    setShowDeleteModal(true);
  };

  // ============================================
  // 삭제 확인 후 실제 삭제 실행
  // ============================================
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'student') {
        await deleteStudent(deleteTarget.data.id);
      } else if (deleteTarget.type === 'class') {
        const studentsInClass = studentsByClass[deleteTarget.data.className] || [];
        for (const student of studentsInClass) {
          await deleteStudent(student.id);
        }
        if (selectedClass === deleteTarget.data.className) {
          setSelectedClass(null);
        }
      }

      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      alert('삭제에 실패했습니다: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================
  // 학생 삭제
  // ============================================
  const handleOpenDeleteStudent = async (student) => {
    // 학생의 통계 정보 가져오기 (경기 수, 배지 수)
    try {
      const history = await getPlayerHistory(student.id);
      const badges = await getPlayerBadges(student.id);

      const gamesCount = history?.games?.length || 0;
      const badgesCount = badges?.badges?.length || 0;

      // 소속 팀 찾기
      const belongingTeams = teams.filter(team =>
        team.players?.some(p => (p.id || p.playerId) === student.id)
      );

      const deletedItems = [
        '학생 정보',
        `모든 경기 기록 (${gamesCount}경기)`,
        `획득한 배지 (${badgesCount}개)`,
        belongingTeams.length > 0 && `팀 명단에서 자동 제거 (${belongingTeams.length}팀)`
      ].filter(Boolean);

      setDeleteTarget({
        type: 'student',
        data: student,
        deletedItems
      });
      setShowDeleteModal(true);
    } catch (error) {
      console.error('삭제 정보 조회 실패:', error);
      // 기본 정보로 모달 열기
      setDeleteTarget({
        type: 'student',
        data: student,
        deletedItems: [
          '학생 정보',
          '모든 경기 기록',
          '획득한 배지',
          '팀 명단에서 자동 제거'
        ]
      });
      setShowDeleteModal(true);
    }
  };

  // ============================================
  // 선수 명단에서 선수 제거
  // ============================================
  const handleRemovePlayerFromTeam = async (index) => {
    const player = selectedTeam.players[index];
    const confirmed = confirm(`"${player.name}"을(를) 팀에서 제거하시겠습니까?`);
    if (!confirmed) return;

    try {
      const newPlayers = selectedTeam.players.filter((_, i) => i !== index);
      await updateTeam(selectedTeam.id, {
        players: newPlayers,
      });
    } catch (error) {
      alert('선수 제거에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 타순 변경
  // ============================================
  const handleChangeBattingOrder = async (index, newOrder) => {
    try {
      const newPlayers = [...selectedTeam.players];
      newPlayers[index] = {
        ...newPlayers[index],
        battingOrder: parseInt(newOrder) || undefined,
      };

      await updateTeam(selectedTeam.id, {
        players: newPlayers,
      });
    } catch (error) {
      alert('타순 변경에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 포지션 변경
  // ============================================
  const handleChangePosition = async (index, newPosition) => {
    try {
      const newPlayers = [...selectedTeam.players];
      newPlayers[index] = {
        ...newPlayers[index],
        position: newPosition || undefined,
      };

      await updateTeam(selectedTeam.id, {
        players: newPlayers,
      });
    } catch (error) {
      alert('포지션 변경에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 랜덤 타순/포지션 설정
  // ============================================
  const POSITIONS = ['포수', '1루수', '2루수', '3루수', '자유수비', '외야수', '직접입력'];

  const handleRandomLineup = async () => {
    if (!selectedTeam || !selectedTeam.players || selectedTeam.players.length === 0) {
      alert('선수가 없습니다.');
      return;
    }

    const confirmed = confirm(
      '🎲 랜덤 타순 & 포지션 설정\n\n' +
      '타순과 포지션을 무작위로 배정합니다.\n계속하시겠습니까?'
    );
    if (!confirmed) return;

    try {
      // 타순 랜덤 배정 (1부터 선수 수까지)
      const shuffledOrders = Array.from({ length: selectedTeam.players.length }, (_, i) => i + 1)
        .sort(() => Math.random() - 0.5);

      // 포지션 랜덤 배정 (중복 허용)
      const newPlayers = selectedTeam.players.map((player, index) => ({
        ...player,
        battingOrder: shuffledOrders[index],
        position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      }));

      await updateTeam(selectedTeam.id, {
        players: newPlayers,
      });

      alert('✅ 랜덤 타순 & 포지션이 설정되었습니다!');
    } catch (error) {
      alert('랜덤 설정에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 드래그 앤 드롭 타순 변경
  // ============================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event) => {
    console.log('🎯 Drag started:', event.active.id);
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    console.log('🎯 Drag ended:', { activeId: active.id, overId: over?.id });

    console.log('🔍 Step 1: setActiveId(null)');
    setActiveId(null);

    console.log('🔍 Step 2: Checking over and active.id');
    if (!over || active.id === over.id) {
      console.log('⚠️ Same position or no valid drop target', { hasOver: !!over, sameId: active.id === over.id });
      return;
    }

    console.log('🔍 Step 3: Checking selectedTeam', {
      hasSelectedTeam: !!selectedTeam,
      hasPlayers: !!selectedTeam?.players,
      playerCount: selectedTeam?.players?.length
    });
    if (!selectedTeam || !selectedTeam.players) {
      console.log('⚠️ No selectedTeam or players');
      return;
    }

    console.log('📋 Current players:', selectedTeam.players.map(p => ({ id: p.id, name: p.name })));

    const oldIndex = selectedTeam.players.findIndex((p) => (p.id || p.name) === active.id);
    const newIndex = selectedTeam.players.findIndex((p) => (p.id || p.name) === over.id);

    console.log('📊 Index info:', { oldIndex, newIndex, activeId: active.id, overId: over.id });

    if (oldIndex === -1 || newIndex === -1) {
      console.error('❌ Could not find indices');
      return;
    }

    try {
      // arrayMove로 순서 변경
      const reorderedPlayers = arrayMove(selectedTeam.players, oldIndex, newIndex);

      // 타순 재배정 (1부터 순서대로)
      const playersWithNewOrder = reorderedPlayers.map((player, index) => ({
        ...player,
        battingOrder: index + 1,
      }));

      console.log('✅ Updating team with new order');
      await updateTeam(selectedTeam.id, {
        players: playersWithNewOrder,
      });
      console.log('✅ Update complete');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('타순 변경에 실패했습니다: ' + error.message);
    }
  };

  // ============================================
  // 팀 삭제
  // ============================================
  const handleDeleteTeam = async (team) => {
    const playerCount = team.players?.length || 0;
    const confirmed = confirm(
      `"${team.name}"을(를) 삭제하시겠습니까?\n\n` +
      (playerCount > 0 ? `선수 ${playerCount}명의 정보가 함께 삭제됩니다.` : '선수가 없는 팀입니다.')
    );
    if (!confirmed) return;

    try {
      await deleteTeam(team.id);

      // 삭제된 팀이 현재 선택된 팀이면 선택 해제
      if (selectedTeam?.id === team.id) {
        setSelectedTeam(null);
      }
    } catch (error) {
      alert('팀 삭제에 실패했습니다: ' + error.message);
    }
  };

  return (
    <div className="h-full flex gap-4 p-4">
      {/* ============================================ */}
      {/* 좌측: 학급 관리 (30%) */}
      {/* ============================================ */}
      <div className="w-[30%] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">학급 관리</h2>
          <div className="flex gap-2">
            {isClassEditMode ? (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-200 text-emerald-700 hover:bg-emerald-300"
                  onClick={() => setShowAddClassModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새 학급
                </Button>
                <Button
                  size="sm"
                  className="bg-sky-200 text-sky-700 hover:bg-sky-300"
                  onClick={() => setIsClassEditMode(false)}
                >
                  완료
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsClassEditMode(true)}
              >
                편집
              </Button>
            )}
          </div>
        </div>

        {/* 학급 목록 (아코디언) */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {classNames.map((className) => (
            <Card key={className} className="relative p-3">
              {/* 학급 삭제 버튼 (편집 모드일 때만) */}
              {isClassEditMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteClass(className);
                  }}
                  className="absolute -top-2 -right-2 bg-rose-200 text-rose-700 rounded-full p-1 hover:bg-rose-300 transition-colors shadow-md"
                  title="학급 삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* 학급 헤더 */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => toggleClass(className)}
                  className="flex-1 text-left font-semibold text-sm flex justify-between items-center hover:text-primary transition-colors"
                >
                  <span>{className}</span>
                  <span className="text-xs text-muted-foreground">
                    {studentsByClass[className].length}명
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenAddStudents(className)}
                  className="ml-2 h-7 px-2"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {/* 학생 목록 (5열 그리드) */}
              {selectedClass === className && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {studentsByClass[className].map((student) => (
                    <div
                      key={student.id}
                      className={`
                        relative p-2 rounded-lg border-2 text-xs font-medium transition-all
                        ${
                          selectedStudents.includes(student.id)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <button
                        onClick={() => toggleStudentSelection(student.id)}
                        className="w-full text-left"
                      >
                        {student.name}
                      </button>
                      {isClassEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteStudent(student);
                          }}
                          className="absolute -top-1 -right-1 bg-rose-200 text-rose-700 rounded-full p-0.5 hover:bg-rose-300 transition-colors"
                          title="삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {/* 학급 없을 때 */}
          {classNames.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              등록된 학급이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* 우측: 팀 관리 (70%) */}
      {/* ============================================ */}
      <div className="w-[70%] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">팀 관리</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <input
                type="checkbox"
                checked={badgeVisible}
                onChange={(e) => setBadgeVisible(e.target.checked)}
                className="rounded"
              />
              배지 표시
            </label>
            {isTeamEditMode ? (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-200 text-emerald-700 hover:bg-emerald-300"
                  onClick={() => setShowAddTeamModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새 팀
                </Button>
                <Button
                  size="sm"
                  className="bg-sky-200 text-sky-700 hover:bg-sky-300"
                  onClick={() => setIsTeamEditMode(false)}
                >
                  완료
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTeamEditMode(true)}
              >
                편집
              </Button>
            )}
          </div>
        </div>

        {/* 팀 카드 리스트 (작은 카드, 위쪽) */}
        <div className="relative">
          {/* 좌측 화살표 (5개 이상일 때만) */}
          {teams.length > TEAMS_PER_PAGE && currentTeamIndex > 0 && (
            <button
              onClick={handlePrevTeams}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background border-2 border-border rounded-full p-2 hover:bg-primary/10 hover:border-primary transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* 팀 카드 그리드 (최대 4개) */}
          <div className="grid grid-cols-4 gap-3 px-8">
            {visibleTeams.map((team) => (
              <Card
                key={team.id}
                className={`relative p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTeam?.id === team.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedTeam(team)}
              >
                {isTeamEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(team);
                    }}
                    className="absolute -top-2 -right-2 bg-rose-200 text-rose-700 rounded-full p-1 hover:bg-rose-300 transition-colors shadow-md"
                    title="팀 삭제"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <h3 className="font-bold text-center text-lg text-foreground">
                  {team.name}
                </h3>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  선수 {team.players?.length || 0}명
                </p>
              </Card>
            ))}

            {/* 팀 없을 때 */}
            {teams.length === 0 && (
              <div className="col-span-4 flex items-center justify-center text-muted-foreground text-sm py-8">
                등록된 팀이 없습니다.
              </div>
            )}
          </div>

          {/* 우측 화살표 (5개 이상일 때만) */}
          {teams.length > TEAMS_PER_PAGE &&
            currentTeamIndex + TEAMS_PER_PAGE < teams.length && (
              <button
                onClick={handleNextTeams}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background border-2 border-border rounded-full p-2 hover:bg-primary/10 hover:border-primary transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
        </div>

        {/* 페이지 인디케이터 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTeamIndex(i * TEAMS_PER_PAGE)}
                className={`w-2 h-2 rounded-full transition-all ${
                  Math.floor(currentTeamIndex / TEAMS_PER_PAGE) === i
                    ? 'bg-primary w-4'
                    : 'bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* 선택된 팀 상세 정보 (아래쪽) */}
        {selectedTeam ? (
          <Card className="p-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-foreground">{selectedTeam.name} 상세</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRandomLineup}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
                  disabled={!selectedTeam.players || selectedTeam.players.length === 0}
                >
                  🎲 랜덤 설정
                </Button>
                <Button size="sm" variant="outline" onClick={handleOpenImportPlayers}>
                  <Plus className="w-4 h-4 mr-1" />
                  학급에서 가져오기
                </Button>
                <Button size="sm" variant="outline" onClick={handleOpenAddPlayer}>
                  <Plus className="w-4 h-4 mr-1" />
                  새로 추가
                </Button>
                {isTeamEditMode && (
                  <Button
                    size="sm"
                    className="bg-rose-200 text-rose-700 hover:bg-rose-300"
                    onClick={() => handleDeleteTeam(selectedTeam)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    팀 삭제
                  </Button>
                )}
              </div>
            </div>

            {/* 팀 선수 명단 */}
            {selectedTeam.players && selectedTeam.players.length > 0 ? (
              <div className="space-y-2">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-12 gap-3 items-center px-3 py-2 bg-muted/30 rounded-lg text-sm font-semibold text-muted-foreground">
                  <div className="col-span-1 text-center">
                    <GripVertical className="w-4 h-4 mx-auto text-muted-foreground" />
                  </div>
                  <div className="col-span-2 text-center">타순</div>
                  <div className="col-span-4">이름</div>
                  <div className="col-span-3 text-center">포지션</div>
                  <div className="col-span-1"></div>
                  {isTeamEditMode && <div className="col-span-1"></div>}
                </div>

                {/* 드래그 앤 드롭 컨텍스트 */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={selectedTeam.players.map((p) => p.id || p.name)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedTeam.players.map((player, index) => (
                        <SortablePlayerRow
                          key={player.id || player.name}
                          player={player}
                          index={index}
                          isTeamEditMode={isTeamEditMode}
                          positions={POSITIONS}
                          onChangePosition={handleChangePosition}
                          onRemove={handleRemovePlayerFromTeam}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                등록된 선수가 없습니다.
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-4 max-h-[calc(100vh-28rem)] flex items-center justify-center text-muted-foreground">
            팀을 선택하면 상세 정보가 표시됩니다.
          </Card>
        )}
      </div>

      {/* ============================================ */}
      {/* 새 학급 추가 모달 */}
      {/* ============================================ */}
      <Dialog open={showAddClassModal} onOpenChange={setShowAddClassModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 학급 추가</DialogTitle>
            <DialogDescription>
              학급 이름을 입력하세요. (예: 6학년 1반)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="className">학급 이름 *</Label>
              <Input
                id="className"
                placeholder="예: 6학년 1반"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClassModal(false)}>
              취소
            </Button>
            <Button onClick={handleAddClass}>다음</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 학생 일괄 추가 모달 */}
      {/* ============================================ */}
      <Dialog open={showAddStudentsModal} onOpenChange={setShowAddStudentsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{targetClass} - 학생 추가</DialogTitle>
            <DialogDescription>
              학생 이름을 입력하세요. 줄바꿈(Enter) 또는 쉼표(,)로 구분하여 여러 명을 한 번에 추가할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkStudents">학생 이름 *</Label>
              <Textarea
                id="bulkStudents"
                placeholder="홍길동&#10;김철수, 이영희&#10;박민수"
                value={bulkStudentNames}
                onChange={(e) => setBulkStudentNames(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                예시: "홍길동" 또는 "김철수, 이영희" 또는 줄바꿈으로 구분
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddStudentsModal(false);
              setBulkStudentNames('');
              setTargetClass('');
            }}>
              취소
            </Button>
            <Button onClick={handleAddStudentsBulk}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 새 팀 추가 모달 */}
      {/* ============================================ */}
      <Dialog open={showAddTeamModal} onOpenChange={setShowAddTeamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 팀 추가</DialogTitle>
            <DialogDescription>
              팀 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 학년/반 입력 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="teamGrade">학년</Label>
                <Input
                  id="teamGrade"
                  type="number"
                  placeholder="예: 6"
                  value={newTeamGrade}
                  onChange={(e) => setNewTeamGrade(e.target.value)}
                  disabled={isAddingTeam}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamClassNum">반</Label>
                <Input
                  id="teamClassNum"
                  type="number"
                  placeholder="예: 1"
                  value={newTeamClassNum}
                  onChange={(e) => setNewTeamClassNum(e.target.value)}
                  disabled={isAddingTeam}
                />
              </div>
            </div>

            {/* 팀 이름을 학년 반으로 하기 체크박스 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useGradeAsName"
                checked={useGradeAsName}
                onChange={(e) => setUseGradeAsName(e.target.checked)}
                disabled={isAddingTeam}
                className="rounded"
              />
              <Label htmlFor="useGradeAsName" className="cursor-pointer">
                팀 이름을 학년 반으로 하기
                {useGradeAsName && newTeamGrade && newTeamClassNum && (
                  <span className="ml-2 text-sm text-primary">
                    ({newTeamGrade}학년 {newTeamClassNum}반)
                  </span>
                )}
              </Label>
            </div>

            {/* 팀 이름 직접 입력 */}
            <div className="space-y-2">
              <Label htmlFor="teamName">
                팀 이름 {!useGradeAsName && '*'}
              </Label>
              <Input
                id="teamName"
                placeholder="예: A팀"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAddingTeam && handleAddTeam()}
                disabled={isAddingTeam || useGradeAsName}
              />
              {useGradeAsName && (
                <p className="text-xs text-muted-foreground">
                  학년/반으로 자동 생성됩니다.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTeamModal(false);
                setNewTeamName('');
                setNewTeamGrade('');
                setNewTeamClassNum('');
                setUseGradeAsName(false);
              }}
              disabled={isAddingTeam}
            >
              취소
            </Button>
            <Button onClick={handleAddTeamStep1} disabled={isAddingTeam}>
              다음 →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 새 팀 추가 - Step 2: 선수 선택 모달 */}
      {/* ============================================ */}
      <Dialog open={showAddTeamStep2Modal} onOpenChange={setShowAddTeamStep2Modal}>
        <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {newTeamInfo?.name} - 선수 선택 및 타순/포지션 설정
            </DialogTitle>
            <DialogDescription>
              좌측에서 학생을 선택하고, 우측에서 타순과 포지션을 조정하세요.
            </DialogDescription>
          </DialogHeader>

          {classNames.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              등록된 학생이 없습니다. 먼저 학급과 학생을 추가하세요.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 overflow-hidden flex-1">
              {/* ========== 좌측: 학생 선택 ========== */}
              <div className="flex flex-col border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">학급별 학생 목록</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allStudents = students.filter(s => s);
                        const allSelected = allStudents.every(s =>
                          selectedPlayersForNewTeam.some(p => p.id === s.id)
                        );
                        if (allSelected) {
                          setSelectedPlayersForNewTeam([]);
                        } else {
                          setSelectedPlayersForNewTeam(allStudents);
                        }
                      }}
                      className="text-xs h-7"
                    >
                      {students.every(s => selectedPlayersForNewTeam.some(p => p.id === s.id))
                        ? '전체 해제'
                        : '전체 선택'}
                    </Button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 p-3 space-y-3">
                  {classNames.map((className) => {
                    const studentsInClass = studentsByClass[className];
                    const selectedCount = studentsInClass.filter(s =>
                      selectedPlayersForNewTeam.some(p => p.id === s.id)
                    ).length;
                    const isExpanded = expandedClasses[className] !== false; // 기본값 true

                    return (
                      <div key={className} className="border rounded-lg overflow-hidden">
                        {/* 학급 헤더 (접기/펼치기) */}
                        <button
                          onClick={() => {
                            setExpandedClasses(prev => ({
                              ...prev,
                              [className]: !isExpanded
                            }));
                          }}
                          className="w-full px-3 py-2 bg-muted/50 hover:bg-muted flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                            <h4 className="font-semibold text-sm">
                              {className} ({studentsInClass.length}명)
                              {selectedCount > 0 && (
                                <span className="ml-2 text-xs text-primary">
                                  ({selectedCount}명 선택)
                                </span>
                              )}
                            </h4>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              const allSelected = studentsInClass.every(s =>
                                selectedPlayersForNewTeam.some(p => p.id === s.id)
                              );
                              if (allSelected) {
                                setSelectedPlayersForNewTeam(prev =>
                                  prev.filter(p => !studentsInClass.some(s => s.id === p.id))
                                );
                              } else {
                                setSelectedPlayersForNewTeam(prev => {
                                  const newSelections = studentsInClass.filter(
                                    s => !prev.some(p => p.id === s.id)
                                  );
                                  return [...prev, ...newSelections];
                                });
                              }
                            }}
                            className="text-xs h-6 px-2"
                          >
                            {studentsInClass.every(s =>
                              selectedPlayersForNewTeam.some(p => p.id === s.id)
                            )
                              ? '해제'
                              : '선택'}
                          </Button>
                        </button>

                        {/* 학생 그리드 */}
                        {isExpanded && (
                          <div className="p-2 grid grid-cols-4 gap-2">
                            {studentsInClass.map((student) => {
                              const isSelected = selectedPlayersForNewTeam.some(p => p.id === student.id);
                              const selectedIndex = selectedPlayersForNewTeam.findIndex(p => p.id === student.id);

                              return (
                                <button
                                  key={student.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedPlayersForNewTeam(prev =>
                                        prev.filter(p => p.id !== student.id)
                                      );
                                    } else {
                                      setSelectedPlayersForNewTeam(prev => [...prev, student]);
                                    }
                                  }}
                                  className={`
                                    relative p-2 rounded border-2 text-xs font-bold transition-all text-left
                                    ${isSelected
                                      ? 'bg-primary/10 border-primary text-primary'
                                      : 'bg-card border-border hover:border-primary/50'
                                    }
                                  `}
                                >
                                  {student.name}
                                  {isSelected && (
                                    <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                                      {selectedIndex + 1}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ========== 우측: 선택된 선수 & 타순/포지션 ========== */}
              <div className="flex flex-col border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">
                      선택된 선수 ({selectedPlayersForNewTeam.length}명)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // 랜덤 타순 (섞기)
                          const shuffled = [...selectedPlayersForNewTeam].sort(() => Math.random() - 0.5);
                          setSelectedPlayersForNewTeam(shuffled);
                        }}
                        disabled={selectedPlayersForNewTeam.length === 0}
                        className="text-xs h-7"
                      >
                        🎲 랜덤 타순
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedPlayersForNewTeam.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    좌측에서 학생을 선택하세요
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 p-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;

                        const oldIndex = selectedPlayersForNewTeam.findIndex(p => p.id === active.id);
                        const newIndex = selectedPlayersForNewTeam.findIndex(p => p.id === over.id);

                        if (oldIndex !== -1 && newIndex !== -1) {
                          setSelectedPlayersForNewTeam(arrayMove(selectedPlayersForNewTeam, oldIndex, newIndex));
                        }
                      }}
                    >
                      <SortableContext
                        items={selectedPlayersForNewTeam.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {selectedPlayersForNewTeam.map((player, index) => {
                            const POSITIONS_FOR_NEW_TEAM = ['포수', '1루수', '2루수', '3루수', '자유수비', '외야수'];
                            const autoPosition = POSITIONS_FOR_NEW_TEAM[index % POSITIONS_FOR_NEW_TEAM.length];

                            return (
                              <SortablePlayerRowForNewTeam
                                key={player.id}
                                player={player}
                                index={index}
                                autoPosition={autoPosition}
                                currentPosition={playerPositions[player.id]}
                                onPositionChange={(playerId, position) => {
                                  setPlayerPositions(prev => ({
                                    ...prev,
                                    [playerId]: position
                                  }));
                                }}
                                onRemove={() => {
                                  setSelectedPlayersForNewTeam(prev =>
                                    prev.filter(p => p.id !== player.id)
                                  );
                                  setPlayerPositions(prev => {
                                    const newPositions = { ...prev };
                                    delete newPositions[player.id];
                                    return newPositions;
                                  });
                                }}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedPlayersForNewTeam.length > 0 ? (
                  <span className="text-primary font-semibold">
                    ✓ {selectedPlayersForNewTeam.length}명 선택됨 (타순 및 포지션 자동 배정)
                  </span>
                ) : (
                  <span>학생을 선택하세요</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelAddTeam}>
                  ← 이전
                </Button>
                <Button onClick={handleAddTeamStep2Complete} disabled={isAddingTeam}>
                  {isAddingTeam ? '생성 중...' : '팀 생성 완료'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 학급에서 선수 가져오기 모달 */}
      {/* ============================================ */}
      <Dialog open={showImportPlayersModal} onOpenChange={setShowImportPlayersModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} - 학급에서 선수 가져오기</DialogTitle>
            <DialogDescription>
              학급별 학생 목록에서 선수를 선택하세요. 여러 명을 선택할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 전체 선택/해제 버튼 */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleAllSelection}
                className="text-xs"
              >
                {students.filter((s) => !selectedTeam?.players?.some((p) => p.id === s.id)).every((s) =>
                  selectedPlayersForTeam.some((p) => p.id === s.id)
                )
                  ? '전체 해제'
                  : '전체 선택'}
              </Button>
            </div>

            {classNames.map((className) => {
              const availableCount = studentsByClass[className].filter(
                (s) => !selectedTeam?.players?.some((p) => p.id === s.id)
              ).length;
              const selectedCount = studentsByClass[className].filter((s) =>
                selectedPlayersForTeam.some((p) => p.id === s.id)
              ).length;

              return (
                <div key={className} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm">
                      {className} ({studentsByClass[className].length}명)
                      {selectedCount > 0 && (
                        <span className="ml-2 text-xs text-primary">
                          ({selectedCount}명 선택)
                        </span>
                      )}
                    </h4>
                    {availableCount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleClassSelection(className)}
                        className="text-xs h-6 px-2"
                      >
                        {studentsByClass[className]
                          .filter((s) => !selectedTeam?.players?.some((p) => p.id === s.id))
                          .every((s) => selectedPlayersForTeam.some((p) => p.id === s.id))
                          ? '해제'
                          : '선택'}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {studentsByClass[className].map((student) => {
                      const isSelected = selectedPlayersForTeam.some((p) => p.id === student.id);
                      const isAlreadyInTeam = selectedTeam?.players?.some((p) => p.id === student.id);

                      return (
                        <button
                          key={student.id}
                          onClick={() => !isAlreadyInTeam && togglePlayerSelection(student)}
                          disabled={isAlreadyInTeam}
                          className={`
                            p-2 rounded-lg border-2 text-xs font-bold transition-all text-left
                            ${isAlreadyInTeam
                              ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed'
                              : isSelected
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-card border-border hover:border-primary/50'
                            }
                          `}
                        >
                          {student.name}
                          {isAlreadyInTeam && <span className="ml-1 text-xs">(이미 추가됨)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {classNames.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                등록된 학생이 없습니다. 먼저 학급과 학생을 추가하세요.
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                선택: {selectedPlayersForTeam.length}명
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setShowImportPlayersModal(false);
                  setSelectedPlayersForTeam([]);
                }}>
                  취소
                </Button>
                <Button onClick={handleImportPlayers} disabled={selectedPlayersForTeam.length === 0}>
                  추가
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 새 선수 직접 추가 모달 */}
      {/* ============================================ */}
      <Dialog open={showAddPlayerModal} onOpenChange={setShowAddPlayerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} - 새 선수 추가</DialogTitle>
            <DialogDescription>
              선수 이름을 입력하세요. 이 선수는 학급에 속하지 않은 임시 선수입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">선수 이름 *</Label>
              <Input
                id="playerName"
                placeholder="예: 홍길동"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddPlayerModal(false);
              setNewPlayerName('');
            }}>
              취소
            </Button>
            <Button onClick={handleAddPlayer}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 삭제 확인 모달 */}
      {/* ============================================ */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === 'student' ? '학생 삭제' : '학급 삭제'}
        itemName={deleteTarget?.type === 'student'
          ? deleteTarget?.data?.name
          : deleteTarget?.data?.className
        }
        deletedItems={deleteTarget?.deletedItems || []}
        isDeleting={isDeleting}
      />
    </div>
  );
}
