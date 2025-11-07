import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';

/**
 * 주자 상황 조정 모달
 * 안타 기록 후 주자 위치를 사용자가 수동으로 조정할 수 있는 모달
 * 홈인된 주자도 표시하여 베이스로 복귀 가능
 * 현재 타자의 진루 상황도 조정 가능 (안타 → 아웃 전환 포함)
 */
const RunnerAdjustmentModal = ({
  isOpen,
  onClose,
  runners,
  initialHomeRunners = [],
  currentBatter = null, // { name, playerIndex, hitType }
  onConfirm
}) => {
  // 로컬 상태로 주자 위치 관리
  const [localRunners, setLocalRunners] = useState({
    first: null,
    second: null,
    third: null,
  });

  // 홈인된 주자 목록 (득점 예정)
  const [homeRunners, setHomeRunners] = useState([]);

  // props로 받은 runners를 로컬 상태로 복사
  useEffect(() => {
    const newRunners = runners ? { ...runners } : { first: null, second: null, third: null };
    const newHomeRunners = [...initialHomeRunners];

    // 타자를 적절한 위치에 배치
    if (currentBatter) {
      const targetBase = currentBatter.hitType === '1루타' ? 'first'
                       : currentBatter.hitType === '2루타' ? 'second'
                       : currentBatter.hitType === '3루타' ? 'third'
                       : currentBatter.hitType === '홈런' ? 'home'
                       : null;

      console.log(`🎯 타자 초기 배치: ${currentBatter.name} (${currentBatter.hitType}) → ${targetBase}`);

      if (targetBase === 'home') {
        // 홈런: 홈에 추가
        newHomeRunners.push({
          name: currentBatter.name,
          playerIndex: currentBatter.playerIndex,
          fromBase: 'batter'
        });
      } else if (targetBase) {
        // 일반 안타: 해당 베이스에 배치
        newRunners[targetBase] = {
          name: currentBatter.name,
          playerIndex: currentBatter.playerIndex
        };
      }
    }

    setLocalRunners(newRunners);
    setHomeRunners(newHomeRunners);
  }, [runners, initialHomeRunners, currentBatter]);

  // 주자 이동 핸들러
  const handleRunnerMove = (currentBase, newBase, runnerData) => {
    const newRunners = { ...localRunners };
    const newHomeRunners = [...homeRunners];

    if (newBase === 'home') {
      // 홈인: 베이스에서 제거하고 홈 목록에 추가
      if (currentBase !== 'home') {
        newRunners[currentBase] = null;
        newHomeRunners.push({ ...runnerData, fromBase: currentBase });
      }
      setHomeRunners(newHomeRunners);
    } else if (newBase === 'out') {
      // 아웃: 베이스와 홈 목록에서 모두 제거
      if (currentBase === 'home') {
        const filtered = newHomeRunners.filter(r => r.playerIndex !== runnerData.playerIndex);
        setHomeRunners(filtered);
      } else {
        newRunners[currentBase] = null;
      }
    } else {
      // 다른 베이스로 이동
      if (currentBase === 'home') {
        // 홈에서 베이스로 복귀
        const filtered = newHomeRunners.filter(r => r.playerIndex !== runnerData.playerIndex);
        setHomeRunners(filtered);
        newRunners[newBase] = runnerData;
      } else if (newBase !== currentBase) {
        // 베이스 간 이동
        const runner = localRunners[currentBase];
        newRunners[currentBase] = null;
        newRunners[newBase] = runner;
      }
    }

    setLocalRunners(newRunners);
  };

  // 확인 버튼 클릭
  const handleConfirm = () => {
    // 타자가 있는지 확인
    if (currentBatter) {
      // 타자가 어디에 있는지 찾기
      const batterOnBase = Object.keys(localRunners).find(
        base => localRunners[base]?.playerIndex === currentBatter.playerIndex
      );
      const batterInHome = homeRunners.find(
        r => r.playerIndex === currentBatter.playerIndex
      );

      // 타자가 베이스에도 없고 홈에도 없으면 → 아웃
      const finalBatterStatus = (batterOnBase || batterInHome) ? 'onBase' : 'out';

      console.log(`🎯 확인: ${currentBatter.name} 최종 상태 = ${finalBatterStatus}`);
      console.log(`  - batterOnBase: ${batterOnBase}, batterInHome: ${batterInHome ? 'yes' : 'no'}`);

      onConfirm(localRunners, finalBatterStatus);
    } else {
      // 타자가 없으면 null 전달
      onConfirm(localRunners, null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => {
          // backdrop 클릭 방지 (주자 상황은 반드시 확인 또는 취소 버튼으로만 닫아야 함)
          e.preventDefault();
          console.warn('⚠️ 주자 모달: backdrop 클릭 차단 (확인/취소 버튼 사용)');
        }}
      >
        {/* 헤더 */}
        <DialogHeader className="pb-2">
          <DialogTitle className="text-3xl font-bold text-center">⚾ 주자 상황 조정</DialogTitle>
        </DialogHeader>

        {/* 바디 */}
        <div className="space-y-4 py-2">
          {/* 야구 다이아몬드 */}
          <div className="flex justify-center">
            <div
              className="relative bg-gradient-to-br from-green-600 to-green-800 rounded-lg shadow-lg"
              style={{ width: '240px', height: '240px' }}
            >
              {/* 내야 */}
              <div
                className="absolute bg-gradient-to-br from-orange-700 to-amber-800"
                style={{
                  width: '65%',
                  height: '65%',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                }}
              />

              {/* 베이스 연결선 */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <line x1="50%" y1="85%" x2="85%" y2="50%" stroke="white" strokeWidth="2" opacity="0.6" />
                <line x1="85%" y1="50%" x2="50%" y2="15%" stroke="white" strokeWidth="2" opacity="0.6" />
                <line x1="50%" y1="15%" x2="15%" y2="50%" stroke="white" strokeWidth="2" opacity="0.6" />
                <line x1="15%" y1="50%" x2="50%" y2="85%" stroke="white" strokeWidth="2" opacity="0.6" />
              </svg>

              {/* 2루 */}
              <div
                className={`absolute w-10 h-10 transform shadow-lg border-2 border-white ${
                  localRunners?.second ? 'bg-yellow-400' : 'bg-gray-100'
                } z-10`}
                style={{
                  top: '15%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(45deg)`,
                  borderRadius: '2px',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-lg">
                  {localRunners?.second ? '🏃' : '2'}
                </div>
              </div>

              {/* 3루 */}
              <div
                className={`absolute w-10 h-10 transform shadow-lg border-2 border-white ${
                  localRunners?.third ? 'bg-yellow-400' : 'bg-gray-100'
                } z-10`}
                style={{
                  top: '50%',
                  left: '15%',
                  transform: `translate(-50%, -50%) rotate(45deg)`,
                  borderRadius: '2px',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-lg">
                  {localRunners?.third ? '🏃' : '3'}
                </div>
              </div>

              {/* 1루 */}
              <div
                className={`absolute w-10 h-10 transform shadow-lg border-2 border-white ${
                  localRunners?.first ? 'bg-yellow-400' : 'bg-gray-100'
                } z-10`}
                style={{
                  top: '50%',
                  left: '85%',
                  transform: `translate(-50%, -50%) rotate(45deg)`,
                  borderRadius: '2px',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-lg">
                  {localRunners?.first ? '🏃' : '1'}
                </div>
              </div>

              {/* 홈베이스 */}
              <div
                className={`absolute w-10 h-10 transform shadow-lg border-2 border-white z-10 ${
                  homeRunners.length > 0 ? 'bg-yellow-400' : 'bg-white'
                }`}
                style={{
                  top: '85%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  borderRadius: '2px',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-lg">
                  {homeRunners.length > 0 ? '🏃' : 'H'}
                </div>
              </div>
            </div>
          </div>

          {/* 주자 선택 드롭다운 */}
          <div className="space-y-3 px-4">
            {/* 베이스 주자들 */}
            <div>
              {/* 3루 주자 */}
              {localRunners?.third && (
                <div className={`flex items-center justify-center gap-3 mb-3 rounded-lg p-2 ${
                  currentBatter && localRunners.third.playerIndex === currentBatter.playerIndex
                    ? 'border-2 border-purple-400 bg-purple-50'
                    : ''
                }`}>
                  <span className="text-lg w-32 font-bold text-center">
                    3루: {localRunners.third.name}
                    {currentBatter && localRunners.third.playerIndex === currentBatter.playerIndex && (
                      <div className="text-xs text-purple-600 font-semibold">⚾ 현재타자 ({currentBatter.hitType})</div>
                    )}
                  </span>
                  <Select
                    defaultValue="third"
                    onValueChange={(value) => handleRunnerMove('third', value, localRunners.third)}
                  >
                    <SelectTrigger className="w-44 h-11 text-lg font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="third" className="text-lg font-semibold">3루 유지</SelectItem>
                      <SelectItem value="home" className="text-lg font-semibold">⚡ 홈인</SelectItem>
                      <SelectItem value="second" className="text-lg font-semibold">← 2루</SelectItem>
                      <SelectItem value="out" className="text-lg font-semibold">❌ 아웃</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 2루 주자 */}
              {localRunners?.second && (
                <div className={`flex items-center justify-center gap-3 mb-3 rounded-lg p-2 ${
                  currentBatter && localRunners.second.playerIndex === currentBatter.playerIndex
                    ? 'border-2 border-purple-400 bg-purple-50'
                    : ''
                }`}>
                  <span className="text-lg w-32 font-bold text-center">
                    2루: {localRunners.second.name}
                    {currentBatter && localRunners.second.playerIndex === currentBatter.playerIndex && (
                      <div className="text-xs text-purple-600 font-semibold">⚾ 현재타자 ({currentBatter.hitType})</div>
                    )}
                  </span>
                  <Select
                    defaultValue="second"
                    onValueChange={(value) => handleRunnerMove('second', value, localRunners.second)}
                  >
                    <SelectTrigger className="w-44 h-11 text-lg font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="second" className="text-lg font-semibold">2루 유지</SelectItem>
                      <SelectItem value="third" className="text-lg font-semibold">→ 3루</SelectItem>
                      <SelectItem value="home" className="text-lg font-semibold">⚡ 홈인</SelectItem>
                      <SelectItem value="first" className="text-lg font-semibold">← 1루</SelectItem>
                      <SelectItem value="out" className="text-lg font-semibold">❌ 아웃</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 1루 주자 */}
              {localRunners?.first && (
                <div className={`flex items-center justify-center gap-3 mb-3 rounded-lg p-2 ${
                  currentBatter && localRunners.first.playerIndex === currentBatter.playerIndex
                    ? 'border-2 border-purple-400 bg-purple-50'
                    : ''
                }`}>
                  <span className="text-lg w-32 font-bold text-center">
                    1루: {localRunners.first.name}
                    {currentBatter && localRunners.first.playerIndex === currentBatter.playerIndex && (
                      <div className="text-xs text-purple-600 font-semibold">⚾ 현재타자 ({currentBatter.hitType})</div>
                    )}
                  </span>
                  <Select
                    defaultValue="first"
                    onValueChange={(value) => handleRunnerMove('first', value, localRunners.first)}
                  >
                    <SelectTrigger className="w-44 h-11 text-lg font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first" className="text-lg font-semibold">1루 유지</SelectItem>
                      <SelectItem value="second" className="text-lg font-semibold">→ 2루</SelectItem>
                      <SelectItem value="third" className="text-lg font-semibold">→ 3루</SelectItem>
                      <SelectItem value="home" className="text-lg font-semibold">⚡ 홈인</SelectItem>
                      <SelectItem value="out" className="text-lg font-semibold">❌ 아웃</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 홈 (득점 예정) - 항상 표시 */}
            <div className="border-t-2 border-blue-200 pt-3 mt-4">
              <div className="text-xl font-extrabold text-blue-700 mb-3 text-center">⚡ 홈 (득점 예정)</div>
              {homeRunners.length > 0 ? (
                homeRunners.map((runner, idx) => (
                  <div key={idx} className={`flex items-center justify-center gap-3 mb-3 rounded-lg p-2 ${
                    currentBatter && runner.playerIndex === currentBatter.playerIndex
                      ? 'border-2 border-purple-400 bg-purple-50'
                      : ''
                  }`}>
                    <span className="text-lg w-32 font-bold text-center">
                      {runner.name}
                      {currentBatter && runner.playerIndex === currentBatter.playerIndex && (
                        <div className="text-xs text-purple-600 font-semibold">⚾ 현재타자 ({currentBatter.hitType})</div>
                      )}
                    </span>
                    <Select
                      defaultValue="home"
                      onValueChange={(value) => handleRunnerMove('home', value, runner)}
                    >
                      <SelectTrigger className="w-44 h-11 text-lg font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home" className="text-lg font-semibold">⚡ 홈(득점)</SelectItem>
                        <SelectItem value="third" className="text-lg font-semibold">→ 3루 복귀</SelectItem>
                        <SelectItem value="second" className="text-lg font-semibold">→ 2루 복귀</SelectItem>
                        <SelectItem value="first" className="text-lg font-semibold">→ 1루 복귀</SelectItem>
                        <SelectItem value="out" className="text-lg font-semibold">❌ 아웃</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))
              ) : (
                <div className="text-center text-base text-gray-500 py-2">
                  득점 예정인 주자가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <DialogFooter className="pt-3 flex justify-center gap-3">
          <Button variant="outline" onClick={onClose} className="text-xl font-bold px-8 py-3">
            취소
          </Button>
          <Button onClick={handleConfirm} className="text-xl font-bold px-8 py-3">확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RunnerAdjustmentModal;
