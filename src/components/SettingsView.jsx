/**
 * SettingsView.jsx
 * 경기 설정, 쿠키 설정, 배지 설정을 탭으로 통합한 페이지
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Label } from './ui/label';
import { Input } from './ui/input';
import BadgeCreator from './BadgeCreator';
import CookieAwardModal from './CookieAwardModal';
import { awardCookie, listenToCookieAwards } from '../services/firestoreService';
import { useGame } from '../contexts/GameContext';

export default function SettingsView({
  onBack,
  customBadges,
  systemBadges,
  hiddenBadges,
  onSaveBadge,
  onDeleteBadge,
  onToggleBadgeVisibility,
  gameDefaultSettings,
  onSaveGameSettings
}) {
  const [activeTab, setActiveTab] = useState('game');

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* 헤더 */}
      <div className="border-b bg-card p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* 좌측: 뒤로가기 버튼 */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
          >
            <span>←</span>
            <span>대시보드</span>
          </button>

          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl font-bold">⚙️ 설정</h1>
          </div>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 w-full flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b flex-shrink-0">
          <TabsTrigger value="game" className="text-base font-semibold">
            ⚾ 경기 설정
          </TabsTrigger>
          <TabsTrigger value="badge" className="text-base font-semibold">
            🏆 배지 설정
          </TabsTrigger>
          <TabsTrigger value="cookie" className="text-base font-semibold">
            🍪 쿠키 관리
          </TabsTrigger>
        </TabsList>

        {/* 경기 설정 탭 */}
        <TabsContent value="game" className="flex-1 overflow-y-auto p-6 mt-0">
          <GameSettingsTab
            gameDefaultSettings={gameDefaultSettings}
            onSaveGameSettings={onSaveGameSettings}
          />
        </TabsContent>

        {/* 배지 설정 탭 */}
        <TabsContent value="badge" className="flex-1 overflow-y-auto p-6 mt-0">
          <BadgeSettingsTab
            customBadges={customBadges}
            systemBadges={systemBadges}
            hiddenBadges={hiddenBadges}
            onSaveBadge={onSaveBadge}
            onDeleteBadge={onDeleteBadge}
            onToggleBadgeVisibility={onToggleBadgeVisibility}
          />
        </TabsContent>

        {/* 쿠키 관리 탭 */}
        <TabsContent value="cookie" className="flex-1 overflow-y-auto p-6 mt-0">
          <CookieSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 경기 설정 탭
 */
function GameSettingsTab({ gameDefaultSettings, onSaveGameSettings }) {
  const [innings, setInnings] = useState(5);
  const [inningEndRule, setInningEndRule] = useState('allBatters');
  const [outsPerInning, setOutsPerInning] = useState(3);
  const [options, setOptions] = useState({
    strikes: true,
    balls: false,
    outs: false,
    bases: true,
  });

  // 초기값 로드
  useEffect(() => {
    if (gameDefaultSettings) {
      setInnings(gameDefaultSettings.innings || 5);
      setInningEndRule(gameDefaultSettings.inningEndRule || 'allBatters');
      setOutsPerInning(gameDefaultSettings.outsPerInning || 3);
      setOptions({
        strikes: gameDefaultSettings.options?.strikes !== undefined ? gameDefaultSettings.options.strikes : true,
        balls: gameDefaultSettings.options?.balls !== undefined ? gameDefaultSettings.options.balls : false,
        outs: gameDefaultSettings.options?.outs !== undefined ? gameDefaultSettings.options.outs : false,
        bases: gameDefaultSettings.options?.bases !== undefined ? gameDefaultSettings.options.bases : true,
      });
    }
  }, [gameDefaultSettings]);

  const handleSave = () => {
    const settings = {
      innings,
      inningEndRule,
      outsPerInning,
      options,
    };
    onSaveGameSettings(settings);
  };

  const handleReset = () => {
    setInnings(5);
    setInningEndRule('allBatters');
    setOutsPerInning(3);
    setOptions({
      strikes: true,
      balls: false,
      outs: false,
      bases: true,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>⚾ 경기 기본 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. 이닝 수 + 이닝 종료 규칙 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold whitespace-nowrap">⚾ 이닝 수:</Label>
              <Input
                type="number"
                value={innings}
                onChange={(e) => setInnings(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                min="1"
                max="9"
                className="w-20 text-center text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">🔄 이닝 종료 규칙:</Label>
              <div className="flex flex-wrap items-center gap-4 pl-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inningEndRule"
                    value="allBatters"
                    checked={inningEndRule === 'allBatters'}
                    onChange={(e) => setInningEndRule(e.target.value)}
                    className="cursor-pointer w-4 h-4"
                  />
                  <span className="text-base whitespace-nowrap">전원타격</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inningEndRule"
                    value="nOuts"
                    checked={inningEndRule === 'nOuts'}
                    onChange={(e) => setInningEndRule(e.target.value)}
                    className="cursor-pointer w-4 h-4"
                  />
                  <span className="text-base whitespace-nowrap">N아웃제</span>
                  {inningEndRule === 'nOuts' && (
                    <Input
                      type="number"
                      value={outsPerInning}
                      onChange={(e) => setOutsPerInning(Math.max(1, Math.min(5, parseInt(e.target.value) || 3)))}
                      min="1"
                      max="5"
                      className="w-16 h-8 text-sm text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inningEndRule"
                    value="manual"
                    checked={inningEndRule === 'manual'}
                    onChange={(e) => setInningEndRule(e.target.value)}
                    className="cursor-pointer w-4 h-4"
                  />
                  <span className="text-base whitespace-nowrap">수동</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. 카운트 옵션 */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">🎯 카운트 옵션:</Label>
            <div className="flex flex-wrap items-center gap-4 pl-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.strikes}
                  onChange={(e) => setOptions({ ...options, strikes: e.target.checked })}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-base whitespace-nowrap">스트라이크</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.balls}
                  onChange={(e) => setOptions({ ...options, balls: e.target.checked })}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-base whitespace-nowrap">볼</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.outs}
                  onChange={(e) => setOptions({ ...options, outs: e.target.checked })}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-base whitespace-nowrap">아웃</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.bases}
                  onChange={(e) => setOptions({ ...options, bases: e.target.checked })}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-base whitespace-nowrap">진루상황</span>
              </label>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
              ℹ️ 새 경기를 만들 때 이 설정이 자동으로 적용됩니다
            </p>
            <p className="text-xs text-blue-600 mt-1">
              저장 후 새 경기 생성 시 이닝 수와 규칙이 자동으로 설정되어 팀 선택만 하면 바로 시작할 수 있습니다.
            </p>
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              🔄 초기화
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              💾 저장
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 쿠키 설정 탭
 */
function CookieSettingsTab() {
  const { students } = useGame();
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieAwards, setCookieAwards] = useState([]);
  const [showLoading, setShowLoading] = useState(false);

  // 쿠키 수여 기록 실시간 리스닝
  useEffect(() => {
    let loadingTimer;
    let isDataLoaded = false;

    // 200ms 후에도 데이터가 로드되지 않았으면 로딩 UI 표시
    loadingTimer = setTimeout(() => {
      if (!isDataLoaded) {
        setShowLoading(true);
      }
    }, 200);

    const unsubscribe = listenToCookieAwards((awards) => {
      isDataLoaded = true;
      setCookieAwards(awards);
      setShowLoading(false);
      clearTimeout(loadingTimer);
    }, 30); // 최근 30개만 표시

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(loadingTimer);
    };
  }, []);

  // 쿠키 수여 핸들러
  const handleAwardCookie = async (awardData) => {
    try {
      await awardCookie(awardData);
      alert('✅ 쿠키를 성공적으로 수여했습니다!');
    } catch (error) {
      console.error('쿠키 수여 실패:', error);
      alert('❌ 쿠키 수여에 실패했습니다: ' + error.message);
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 쿠키 수여 버튼 */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setShowCookieModal(true)}
          className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200"
        >
          🍪 쿠키 수여
        </Button>
      </div>

      {/* 최근 쿠키 수여 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 쿠키 수여 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {showLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-1">데이터 불러오는 중...</p>
              <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
            </div>
          ) : cookieAwards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-5xl mb-4">🍪</p>
              <p className="text-lg font-semibold mb-2">아직 쿠키 수여 기록이 없습니다</p>
              <p className="text-sm">
                학생에게 쿠키를 수여하면 여기에 기록이 표시됩니다
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">날짜/시간</TableHead>
                    <TableHead>학생</TableHead>
                    <TableHead className="w-[100px] text-center">수량</TableHead>
                    <TableHead className="min-w-[200px]">메모</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cookieAwards.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell className="font-medium">
                        {formatDate(award.awardedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{award.studentName}</span>
                          <span className="text-xs text-muted-foreground">
                            {award.className} {award.classNumber}번
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-semibold">
                          🍪 {award.amount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2">{award.memo}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 쿠키 수여 모달 */}
      <CookieAwardModal
        open={showCookieModal}
        onOpenChange={setShowCookieModal}
        students={students}
        onAwardCookie={handleAwardCookie}
      />
    </div>
  );
}

/**
 * 배지 설정 탭
 */
function BadgeSettingsTab({
  customBadges,
  systemBadges,
  hiddenBadges,
  onSaveBadge,
  onDeleteBadge,
  onToggleBadgeVisibility
}) {
  const [activeTab, setActiveTab] = useState('create');
  const [editMode, setEditMode] = useState('custom'); // 'system' | 'custom'
  const [editingBadge, setEditingBadge] = useState(null);

  const handleSaveBadge = (badge) => {
    onSaveBadge(badge);
    setEditingBadge(null);
    setActiveTab('edit');
  };

  const handleCancelEdit = () => {
    setEditingBadge(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">➕ 새로 만들기</TabsTrigger>
          <TabsTrigger value="edit">✏️ 수정하기</TabsTrigger>
        </TabsList>

        {/* 새로 만들기 탭 */}
        <TabsContent value="create" className="max-w-full">
          <BadgeCreator
            onSave={handleSaveBadge}
            standalone={false}
          />
        </TabsContent>

        {/* 수정하기 탭 */}
        <TabsContent value="edit" className="max-w-full">
          {editingBadge ? (
            <BadgeCreator
              initialBadge={editingBadge}
              onSave={handleSaveBadge}
              onCancel={handleCancelEdit}
              standalone={false}
            />
          ) : (
            <div className="space-y-6">
              {/* 서브탭 */}
              <Tabs value={editMode} onValueChange={setEditMode}>
                <TabsList className="w-full">
                  <TabsTrigger value="system" className="flex-1">
                    🎯 기본 배지
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex-1">
                    ✨ 커스텀 배지
                  </TabsTrigger>
                </TabsList>

                {/* 기본 배지 */}
                <TabsContent value="system" className="max-w-full">
                  <p className="text-sm text-muted-foreground mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    ⚠️ 기본 배지는 아이콘과 이름만 수정할 수 있습니다.
                  </p>
                  <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 max-w-full">
                    {systemBadges.map(badge => {
                      const isHidden = hiddenBadges.includes(badge.id);
                      return (
                        <Card
                          key={badge.id}
                          className={`p-4 hover:shadow-lg transition-shadow ${isHidden ? 'opacity-50' : ''}`}
                        >
                          <div className="text-4xl text-center mb-2">{badge.icon}</div>
                          <h3 className="text-sm font-semibold text-center truncate">
                            {badge.name}
                          </h3>
                          <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                            {badge.description}
                          </p>
                          <div className="mt-3 flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingBadge(badge)}
                              type="button"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant={isHidden ? "default" : "ghost"}
                              onClick={() => onToggleBadgeVisibility(badge.id)}
                              type="button"
                              title={isHidden ? "표시하기" : "숨기기"}
                            >
                              {isHidden ? '👁️' : '🙈'}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* 커스텀 배지 */}
                <TabsContent value="custom" className="max-w-full">
                  {customBadges.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-5xl mb-4">📦</p>
                      <p className="text-lg font-semibold mb-2">아직 만든 배지가 없습니다</p>
                      <p className="text-sm">새로 만들기 탭에서 배지를 만들어보세요!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 max-w-full">
                      {customBadges.map(badge => {
                        const isHidden = hiddenBadges.includes(badge.id);
                        return (
                          <Card
                            key={badge.id}
                            className={`p-4 relative hover:shadow-lg transition-shadow ${isHidden ? 'opacity-50' : ''}`}
                          >
                            <div className="text-4xl text-center mb-2">{badge.icon}</div>
                            <h3 className="text-sm font-semibold text-center truncate">
                              {badge.name}
                            </h3>
                            <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                              {badge.description}
                            </p>
                            <div className="mt-3 flex gap-1 justify-center flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingBadge(badge)}
                                type="button"
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant={isHidden ? "default" : "ghost"}
                                onClick={() => onToggleBadgeVisibility(badge.id)}
                                type="button"
                                title={isHidden ? "표시하기" : "숨기기"}
                              >
                                {isHidden ? '👁️' : '🙈'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`"${badge.name}" 배지를 삭제하시겠습니까?`)) {
                                    onDeleteBadge(badge.id);
                                  }
                                }}
                                type="button"
                              >
                                🗑️
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
