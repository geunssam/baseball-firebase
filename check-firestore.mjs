import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDJMMnn5QkA2J2ctKFWcjam9Kii5ysjC5s",
  authDomain: "baseball-firebase-d4d8d.firebaseapp.com",
  projectId: "baseball-firebase-d4d8d",
  storageBucket: "baseball-firebase-d4d8d.firebasestorage.app",
  messagingSenderId: "954883463505",
  appId: "1:954883463505:web:48cf05010b3330263b9b70"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  console.log('\n=== 사용자별 데이터 확인 ===\n');

  // users 컬렉션의 모든 문서 가져오기
  const usersSnapshot = await getDocs(collection(db, 'users'));

  for (const userDoc of usersSnapshot.docs) {
    console.log(`\n👤 사용자: ${userDoc.id}`);

    // classes 서브컬렉션
    const classesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'classes'));
    console.log(`  📚 학급 수: ${classesSnapshot.size}`);
    classesSnapshot.forEach(doc => {
      console.log(`    - ${doc.data().name} (${doc.id})`);
    });

    // teams 서브컬렉션
    const teamsSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'teams'));
    console.log(`  ⚾ 팀 수: ${teamsSnapshot.size}`);
    teamsSnapshot.forEach(doc => {
      console.log(`    - ${doc.data().name} (${doc.id})`);
    });

    // students 서브컬렉션
    const studentsSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'students'));
    console.log(`  👨‍🎓 학생 수: ${studentsSnapshot.size}`);
  }
}

checkData().then(() => {
  console.log('\n✅ 데이터 확인 완료\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 에러:', err);
  process.exit(1);
});
