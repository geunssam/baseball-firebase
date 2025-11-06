import { useState, useEffect, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, Plus, Trash2, X, GripVertical, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { DndContext, closestCenter, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteConfirmModal from './DeleteConfirmModal';
import ClassShareSelectionModal from './ClassShareSelectionModal';
import ClassShareSettingsModal from './ClassShareSettingsModal';
import ShareManagementModal from './ShareManagementModal';
import SharedItemsSection from './SharedItemsSection';
import { isSharedItem, canEdit, canManage, getPermissionBadgeInfo } from '../utils/permissionHelpers.jsx';
import PlayerBadgeDisplay from './PlayerBadgeDisplay';

/**
 * SortablePlayerRow
 * 드래그 가능한 선수 행
 */
const SortablePlayerRow = ({ player, index, isTeamEditMode, positions, onChangePosition, onRemove, students }) => {
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customPosition, setCustomPosition] = useState('');

  // students 배열에서 해당 학생 찾기 (배지 정보 포함)
  const studentWithBadges = students.find(s => s.id === player.id || s.playerId === player.id) || player;

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
      className={`grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_32px] gap-3 items-center px-1.5 py-1.5 border rounded-lg hover:bg-muted/50 transition-colors group bg-background ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <div className="flex items-center justify-center w-6">
        <span
          {...attributes}
          {...listeners}
          className="cursor-move text-muted-foreground hover:text-foreground text-base"
        >
          ⠿
        </span>
      </div>

      {/* 타순 */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center justify-center bg-slate-100 text-black px-2.5 py-1.5 rounded-full font-bold text-base border-2 border-slate-300 whitespace-nowrap">
          {player.battingOrder || index + 1}번
        </div>
      </div>

      {/* 배지 */}
      <div className="flex items-center justify-center">
        <PlayerBadgeDisplay
          player={studentWithBadges}
          maxBadges={3}
          size="md"
          showEmpty={false}
          showOverflow={true}
        />
      </div>

      {/* 이름 */}
      <div className="flex items-center justify-center min-w-0">
        <span className="font-bold text-base truncate">{player.name}</span>
      </div>

      {/* 학급 */}
      <div className="flex items-center justify-center">
        {player.className ? (
          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700 px-2 py-0.5 whitespace-nowrap">
            {player.className}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>

      {/* 학급번호 */}
      <div className="flex items-center justify-center">
        {player.number ? (
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">#{player.number}</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>

      {/* 포지션 드롭박스 또는 직접입력 */}
      <div className="flex items-center justify-center w-full">
        {isCustomInput ? (
          <div className="flex gap-1 w-full">
            <Input
              placeholder="포지션 입력"
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomPositionSubmit()}
              className="h-8 text-sm flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCustomPositionSubmit}
              className="h-8 px-2"
            >
              ✓
            </Button>
          </div>
        ) : (
          <Select value={player.position || ''} onValueChange={handlePositionChange}>
            <SelectTrigger className="h-8 text-sm w-full">
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

      {/* 삭제 버튼 (항상 영역 확보, 편집 모드에서만 표시) */}
      <div className="flex justify-center w-8">
        {isTeamEditMode && (
          <button
            onClick={() => onRemove(index)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
            title="팀에서 제거"
          >
            <Trash2 className="w-3 h-3" />
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

      {/* 배지 */}
      <div className="col-span-2">
        <PlayerBadgeDisplay
          player={player}
          maxBadges={3}
          size="sm"
          showEmpty={false}
          showOverflow={true}
        />
      </div>

      {/* 이름 */}
      <div className="col-span-2">
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
      <div className="col-span-5">
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
  const { classes, students, teams, createStudent, updateStudent, deleteStudent, createTeam, updateTeam, deleteTeam } = useGame();

  // ============================================
  // 상태 관리
  // ============================================
  const [activeTab, setActiveTab] = useState('class'); // 'class' 또는 'team'
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

  // 공유 시스템 모달 (Phase 2)
  const [showShareSelectionModal, setShowShareSelectionModal] = useState(false);
  const [showShareSettingsModal, setShowShareSettingsModal] = useState(false);
  const [selectedItemsForShare, setSelectedItemsForShare] = useState([]);

  // Phase 6: 공유 관리 모달
  const [showShareManagementModal, setShowShareManagementModal] = useState(false);
  const [manageShareItem, setManageShareItem] = useState(null); // { type, id, name }

  // ============================================
  // 학급별 학생 그룹화 (classes 컬렉션 사용)
  // ============================================
  const studentsByClass = useMemo(() => {
    const grouped = {};

    // 1. classes 컬렉션의 모든 학급에 대해 빈 배열 초기화
    classes.forEach(cls => {
      grouped[cls.name] = [];
    });

    // 2. '미지정' 그룹 추가
    grouped['미지정'] = [];

    // 3. 학생들을 해당 학급으로 분배
    students.forEach(student => {
      let targetClassName = '미지정';

      // classId로 먼저 찾기 (새 방식)
      if (student.classId) {
        const cls = classes.find(c => c.id === student.classId);
        if (cls) {
          targetClassName = cls.name;
        }
      }
      // className으로 찾기 (기존 방식, 하위 호환)
      else if (student.className) {
        targetClassName = student.className;
        // 레거시 className이 grouped에 없으면 추가
        if (!grouped[targetClassName]) {
          grouped[targetClassName] = [];
        }
      }

      grouped[targetClassName].push(student);
    });

    return grouped;
  }, [students, classes]);

  // 학급 이름 목록 (classes 컬렉션 생성 순서 유지)
  const classNames = useMemo(() => {
    // 1. classes 컬렉션의 학급들 (생성 순서 유지)
    const names = classes.map(c => c.name);

    // 2. 레거시 학급 이름 (classes 컬렉션에 없지만 학생이 있는 경우)
    const legacyClassNames = Object.keys(studentsByClass).filter(
      name => name !== '미지정' && !names.includes(name)
    );

    // 3. '미지정'은 마지막에 (학생이 있을 때만)
    const result = [...names, ...legacyClassNames];
    if (studentsByClass['미지정']?.length > 0) {
      result.push('미지정');
    }

    return result;
  }, [classes, studentsByClass]);

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
  // 학급 네비게이션
  // ============================================
  const CLASSES_PER_PAGE = 4;
  const [currentClassIndex, setCurrentClassIndex] = useState(0);
  const totalClassPages = Math.ceil(classNames.length / CLASSES_PER_PAGE);
  const visibleClasses = classNames.slice(
    currentClassIndex,
    currentClassIndex + CLASSES_PER_PAGE
  );

  const handlePrevClasses = () => {
    if (currentClassIndex > 0) {
      setCurrentClassIndex(currentClassIndex - CLASSES_PER_PAGE);
    }
  };

  const handleNextClasses = () => {
    if (currentClassIndex + CLASSES_PER_PAGE < classNames.length) {
      setCurrentClassIndex(currentClassIndex + CLASSES_PER_PAGE);
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
      // 줄바꿈으로 학생 분리
      const lines = bulkStudentNames
        .split(/[\n]/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length === 0) {
        alert('유효한 학생 정보가 없습니다.');
        return;
      }

      // 해당 학급의 현재 학생 수 확인하여 번호 시작점 결정
      const classStudents = students.filter(s => s.className === targetClass);
      let startNumber = classStudents.length + 1;

      // 모든 학생을 순차적으로 추가 (위에서부터 순서대로 번호 부여)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 이름,성별 형식으로 파싱
        const parts = line.split(',').map(p => p.trim());
        const name = parts[0];
        const genderText = parts[1]?.toLowerCase(); // '남', '여', 'male', 'female'

        // 성별 변환
        let gender = null;
        if (genderText === '남' || genderText === 'male' || genderText === 'm') {
          gender = 'male';
        } else if (genderText === '여' || genderText === 'female' || genderText === 'f') {
          gender = 'female';
        }

        await createStudent({
          name,
          className: targetClass,
          gender,
          number: startNumber + i, // 순서대로 번호 부여
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
  // 공유 시스템 핸들러 (Phase 2)
  // ============================================
  const handleShareButtonClick = () => {
    setShowShareSelectionModal(true);
  };

  const handleShareSelectionNext = (selectedItems) => {
    setSelectedItemsForShare(selectedItems);
    setShowShareSelectionModal(false);
    setShowShareSettingsModal(true);
  };

  const handleShareSelectionBack = () => {
    setShowShareSelectionModal(false);
  };

  const handleShareSettingsBack = () => {
    setShowShareSettingsModal(false);
    setShowShareSelectionModal(true);
  };

  const handleShareComplete = (shareInfo) => {
    console.log('✅ Share created:', shareInfo);
    setShowShareSettingsModal(false);
    setSelectedItemsForShare([]);
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
    <div className="h-full flex flex-col gap-4 p-4">
      {/* ============================================ */}
      {/* 탭 헤더 */}
      {/* ============================================ */}
      <div className="flex justify-between items-center border-b-2 border-gray-200">
        {/* 탭 버튼들 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('class')}
            className={`px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === 'class'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📚 학급 관리
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === 'team'
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            👥 팀 관리
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === 'shared'
                ? 'border-b-2 border-green-500 text-green-600 bg-green-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🤝 공유받은 항목
          </button>
        </div>

        {/* 우측 액션 버튼들 */}
        <div className="flex gap-2 pr-4">
          {/* 현재 탭에 따라 추가 버튼 표시 */}
          {activeTab === 'class' && (
            <Button
              size="sm"
              className="bg-green-100 text-green-700 hover:bg-green-200"
              onClick={() => setShowAddClassModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              새 학급
            </Button>
          )}
          {activeTab === 'team' && (
            <Button
              size="sm"
              className="bg-green-100 text-green-700 hover:bg-green-200"
              onClick={() => setShowAddTeamModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              새 팀
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowShareSettingsModal(true)}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            🤝 공유하기
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // 전체 항목 관리를 위해 특별한 플래그 설정
              setManageShareItem({
                type: 'all',
                id: null,
                name: '전체 항목'
              });
              setShowShareManagementModal(true);
            }}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            ⚙️ 공유 관리
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* 학급 관리 탭 */}
      {/* ============================================ */}
      {activeTab === 'class' && (
        <div className="flex-1 flex flex-col gap-3 bg-blue-50/30 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">학급 관리</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 bg-blue-100 rounded-md font-medium text-blue-700">
                {classNames.length}개 학급
              </span>
              <span className="px-2 py-1 bg-green-100 rounded-md font-medium text-green-700">
                {students.length}명 학생
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {isClassEditMode ? (
              <Button
                size="sm"
                className="bg-sky-200 text-sky-700 hover:bg-sky-300"
                onClick={() => setIsClassEditMode(false)}
              >
                완료
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsClassEditMode(true)}
                >
                  편집
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 학급 카드 리스트 (상단) */}
        <div className="relative">
          {/* 좌측 화살표 (5개 이상일 때만) */}
          {classNames.length > CLASSES_PER_PAGE && currentClassIndex > 0 && (
            <button
              onClick={handlePrevClasses}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background border-2 border-border rounded-full p-2 hover:bg-primary/10 hover:border-primary transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* 학급 카드 그리드 (최대 4개) */}
          <div className="grid grid-cols-4 gap-2 px-12">
            {visibleClasses.map((className) => (
              <Card
                key={className}
                className={`relative py-3 px-3 cursor-pointer transition-all hover:shadow-md ${
                  selectedClass === className ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedClass(selectedClass === className ? null : className)}
              >
                {isClassEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteClass(className);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-200 text-rose-700 rounded-full p-0.5 hover:bg-rose-300 transition-colors shadow-md"
                    title="학급 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center justify-center gap-2 text-base">
                  <span className="font-bold text-foreground text-lg">{className}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-muted-foreground">
                    {studentsByClass[className].length}명
                  </span>
                </div>
              </Card>
            ))}

            {/* 학급 없을 때 */}
            {classNames.length === 0 && (
              <div className="col-span-4 flex items-center justify-center text-muted-foreground text-sm py-8">
                등록된 학급이 없습니다.
              </div>
            )}
          </div>

          {/* 우측 화살표 (5개 이상일 때만) */}
          {classNames.length > CLASSES_PER_PAGE &&
            currentClassIndex + CLASSES_PER_PAGE < classNames.length && (
              <button
                onClick={handleNextClasses}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background border-2 border-border rounded-full p-2 hover:bg-primary/10 hover:border-primary transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
        </div>

        {/* 페이지 인디케이터 */}
        {totalClassPages > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: totalClassPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentClassIndex(i * CLASSES_PER_PAGE)}
                className={`w-2 h-2 rounded-full transition-all ${
                  Math.floor(currentClassIndex / CLASSES_PER_PAGE) === i
                    ? 'bg-primary w-4'
                    : 'bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* 선택된 학급 학생 목록 (하단) */}
        {selectedClass ? (
          <Card className="p-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-foreground">{selectedClass} 학생 목록</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenAddStudents(selectedClass)}
              >
                <Plus className="w-4 h-4 mr-1" />
                학생 추가
              </Button>
            </div>

            {/* 학생 목록 (4열 그리드로 카드 크기 확대) */}
            <div className="grid grid-cols-4 gap-3">
              {(studentsByClass[selectedClass] || []).map((student) => (
                  <div
                    key={student.id}
                    className={`
                      relative py-3 px-3 rounded-lg border-2 text-xs font-medium transition-all
                      ${
                        selectedStudents.includes(student.id)
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <button
                      onClick={() => toggleStudentSelection(student.id)}
                      className="w-full flex flex-col items-center justify-center gap-2.5"
                    >
                      {/* 첫 번째 줄: 성별 + 배지 */}
                      <div className="flex items-center justify-center gap-2 w-full">
                        {/* 성별 아이콘 */}
                        <span className="text-2xl">
                          {student.gender === 'male' ? '👨‍🎓' : student.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}
                        </span>

                        {/* 배지 표시 */}
                        <PlayerBadgeDisplay
                          player={student}
                          maxBadges={3}
                          size="md"
                          showEmpty={false}
                          showOverflow={true}
                        />
                      </div>

                      {/* 두 번째 줄: 이름 (크게) */}
                      <div className="font-bold text-lg text-center w-full">
                        {student.name}
                      </div>

                      {/* 세 번째 줄: 통계 정보 */}
                      <div className="text-sm text-muted-foreground text-center w-full">
                        {student.badges && student.badges.length > 0
                          ? `🏆 배지 ${student.badges.length}개`
                          : '경기 기록 없음'
                        }
                      </div>
                    </button>
                    {isClassEditMode && (
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newGender = student.gender === 'male' ? 'female' : 'male';
                            updateStudent(student.id, { gender: newGender });
                          }}
                          className="mt-1 text-[10px] px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 transition-colors"
                          title="성별 변경"
                        >
                          {student.gender === 'male' ? '👨→👩' : '👩→👨'}
                        </button>
                      </div>
                    )}
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
                )
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-3">📚</p>
            <p>학급을 선택하면 학생 목록이 표시됩니다</p>
          </Card>
        )}

        </div>
      )}

      {/* ============================================ */}
      {/* 팀 관리 탭 */}
      {/* ============================================ */}
      {activeTab === 'team' && (
        <div className="flex-1 flex flex-col gap-3 bg-purple-50/20 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">팀 관리</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 bg-purple-100 rounded-md font-medium text-purple-700">
                {teams.length}개 팀
              </span>
              <span className="px-2 py-1 bg-blue-100 rounded-md font-medium text-blue-700">
                {classNames.length}개 학급
              </span>
              <span className="px-2 py-1 bg-green-100 rounded-md font-medium text-green-700">
                {students.length}명 학생
              </span>
            </div>
          </div>
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
              <Button
                size="sm"
                className="bg-sky-200 text-sky-700 hover:bg-sky-300"
                onClick={() => setIsTeamEditMode(false)}
              >
                완료
              </Button>
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
          <div className="grid grid-cols-4 gap-2 px-12">
            {visibleTeams.map((team) => (
              <Card
                key={team.id}
                className={`relative py-3 px-3 cursor-pointer transition-all hover:shadow-md ${
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
                    className="absolute -top-1.5 -right-1.5 bg-rose-200 text-rose-700 rounded-full p-0.5 hover:bg-rose-300 transition-colors shadow-md"
                    title="팀 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex flex-col items-center justify-center gap-1.5">
                  {/* 첫 번째 줄: 팀 이름 | 인원 */}
                  <div className="flex items-center justify-center gap-2 text-base">
                    <span className="font-bold text-foreground text-lg">{team.name}</span>
                    {isSharedItem(team) && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${getPermissionBadgeInfo(team.permission).color}`}>
                        {getPermissionBadgeInfo(team.permission).icon}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm text-muted-foreground">
                      {team.players?.length || 0}명
                    </span>
                  </div>
                  {/* 두 번째 줄: 공유 정보 (있을 때만) */}
                  {isSharedItem(team) && (
                    <div className="text-xs text-muted-foreground">
                      by {team.ownerName}
                    </div>
                  )}
                </div>
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
          <Card className="p-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{selectedTeam.name} 상세</h3>
                {isSharedItem(selectedTeam) && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${getPermissionBadgeInfo(selectedTeam.permission).color}`}>
                      {getPermissionBadgeInfo(selectedTeam.permission).icon} {getPermissionBadgeInfo(selectedTeam.permission).label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">by {selectedTeam.ownerName}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit(selectedTeam) ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRandomLineup}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
                      disabled={!selectedTeam.players || selectedTeam.players.length === 0}
                    >
                      🎲 랜덤 설정
                    </Button>
                    {canManage(selectedTeam) && (
                      <>
                        <Button size="sm" variant="outline" onClick={handleOpenImportPlayers}>
                          <Plus className="w-4 h-4 mr-1" />
                          학급에서 가져오기
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleOpenAddPlayer}>
                          <Plus className="w-4 h-4 mr-1" />
                          새로 추가
                        </Button>
                      </>
                    )}
                    {isTeamEditMode && canManage(selectedTeam) && (
                      <Button
                        size="sm"
                        className="bg-rose-200 text-rose-700 hover:bg-rose-300"
                        onClick={() => handleDeleteTeam(selectedTeam)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        팀 삭제
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>조회 전용</span>
                  </div>
                )}
              </div>
            </div>

            {/* 팀 선수 명단 */}
            {selectedTeam.players && selectedTeam.players.length > 0 ? (
              <div className="space-y-2">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_32px] gap-3 items-center px-1.5 py-2 bg-muted/30 rounded-lg text-sm font-semibold text-muted-foreground">
                  <div className="text-center w-6">
                    <GripVertical className="w-4 h-4 mx-auto text-muted-foreground" />
                  </div>
                  <div className="text-center">타순</div>
                  <div className="text-center">배지</div>
                  <div className="text-center">이름</div>
                  <div className="text-center">학급</div>
                  <div className="text-center">번호</div>
                  <div className="text-center">포지션</div>
                  <div className="w-8"></div>
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
                          students={students}
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
      )}

      {/* ============================================ */}
      {/* 공유받은 항목 탭 */}
      {/* ============================================ */}
      {activeTab === 'shared' && (
        <div className="flex-1 flex flex-col gap-3 bg-green-50/30 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">🤝 공유받은 항목</h2>
          </div>

          {/* SharedItemsSection 컴포넌트 */}
          <SharedItemsSection />
        </div>
      )}

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
      <Dialog open={showAddStudentsModal} onOpenChange={(open) => {
        setShowAddStudentsModal(open);
        if (!open) {
          // 모달이 닫힐 때 항상 초기화
          setBulkStudentNames('');
          setTargetClass('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{targetClass} - 학생 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-lg">✅</span>
              <div className="flex-1 text-sm">
                <div className="font-bold text-blue-900 mb-1">
                  입력 형식
                </div>
                <div className="text-blue-800">
                  • <strong>한 줄에 한 명씩</strong> 입력하세요<br />
                  • 형식: <strong className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">이름,성별</strong><br />
                  • 성별: <strong>남/여</strong> 또는 <strong>male/female</strong><br />
                  • 성별 생략 시 이름만 추가됩니다
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkStudents">학생 이름 *</Label>
              <Textarea
                id="bulkStudents"
                placeholder={`홍길동,남
김영희,여
박철수,남
이순이,여`}
                value={bulkStudentNames}
                onChange={(e) => setBulkStudentNames(e.target.value)}
                rows={8}
                className="resize-none font-mono"
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>💡</span>
                <span>
                  예시: <code className="bg-gray-100 px-1.5 py-0.5 rounded">홍길동,남</code> 또는 <code className="bg-gray-100 px-1.5 py-0.5 rounded">김영희,여</code> 또는 <code className="bg-gray-100 px-1.5 py-0.5 rounded">박민수</code>
                </span>
              </div>
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

      {/* ============================================ */}
      {/* 공유 시스템 모달 (Phase 2) */}
      {/* ============================================ */}
      <ClassShareSelectionModal
        open={showShareSelectionModal}
        onOpenChange={setShowShareSelectionModal}
        classes={classNames.map(className => ({
          id: className,
          name: className,
          studentCount: studentsByClass[className]?.length || 0
        }))}
        teams={teams.map(team => ({
          id: team.id,
          name: team.name,
          playerCount: team.players?.length || 0
        }))}
        onNext={handleShareSelectionNext}
      />

      <ClassShareSettingsModal
        open={showShareSettingsModal}
        onOpenChange={setShowShareSettingsModal}
        selectedItems={selectedItemsForShare}
        onBack={handleShareSettingsBack}
        onComplete={handleShareComplete}
      />

      {/* Phase 6: 공유 관리 모달 */}
      <ShareManagementModal
        open={showShareManagementModal}
        onOpenChange={setShowShareManagementModal}
        classId={manageShareItem?.type === 'class' ? manageShareItem.id : null}
        teamId={manageShareItem?.type === 'team' ? manageShareItem.id : null}
        itemType={manageShareItem?.type}
        itemName={manageShareItem?.name}
      />
    </div>
  );
}
