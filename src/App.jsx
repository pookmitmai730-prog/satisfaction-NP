import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import pwaLogo from './assets/pwa.WEBP';

// กำหนดค่าคงที่ของสถานะพนักงานทั้ง 4 แบบ เพื่อใช้อ้างอิงทั่วทั้งระบบและรองรับการกรอง/แสดงผลในอนาคต
const STAFF_STATUS_OPTIONS = [
  { value: 'COUNTER', label: '1. ประจำเคาน์เตอร์', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'OTHER_SERVICE', label: '2. บริการอื่นๆ', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'SUPERVISOR', label: '3. หัวหน้างาน', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'MANAGER', label: '4. ผู้จัดการ', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' }
];

const getStatusInfo = (statusValue) => {
  return STAFF_STATUS_OPTIONS.find((item) => item.value === statusValue) || STAFF_STATUS_OPTIONS[0];
};

const THAI_FONT_STACK = "'Noto Sans Thai', 'Sarabun', 'Prompt', sans-serif";

export default function StaffEvaluationApp() {
  const [step, setStep] = useState('login'); // 'login' | 'evaluating' | 'success' | 'admin-login' | 'admin-dashboard'[cite: 4]
  const [activeAdminTab, setActiveAdminTab] = useState('reports'); // 'reports' | 'employees' | 'criteria'[cite: 4]

  // พนักงาน & ล็อกอิน & ประเภทบริการ[cite: 4]
  const [inputEmpId, setInputEmpId] = useState(''); //[cite: 4]
  const [serviceType, setServiceType] = useState('counter'); // 'counter' (เคาน์เตอร์รับบริการ) | 'other' (อื่นๆ)[cite: 4]
  const [currentStaff, setCurrentStaff] = useState(null); //[cite: 4]
  const [staffList, setStaffList] = useState([]); //[cite: 4]
  const [criteriaList, setCriteriaList] = useState([]); //[cite: 4]

  // สถานะผู้ใช้งานระบบ Admin ที่กำลังล็อกอินอยู่
  const [currentAdminUser, setCurrentAdminUser] = useState(null);

  // ผลประเมิน[cite: 4]
  const [scores, setScores] = useState({}); //[cite: 4]
  const [counterOverallScore, setCounterOverallScore] = useState(null); // คะแนนรวมสำหรับเคาน์เตอร์[cite: 4]
  const [comment, setComment] = useState(''); //[cite: 4]
  const [errorMsg, setErrorMsg] = useState(''); //[cite: 4]

  // Admin States[cite: 4]
  const [adminPin, setAdminPin] = useState(''); //[cite: 4]
  const [evaluationsList, setEvaluationsList] = useState([]); //[cite: 4]
  const [openGraphId, setOpenGraphId] = useState(null); //[cite: 4]

  // Pagination State (แบ่งหน้าตารางครั้งละ 10 แถว)[cite: 4]
  const [currentPage, setCurrentPage] = useState(1); //[cite: 4]
  const rowsPerPage = 10; //[cite: 4]

  // Form States: เพิ่ม/แก้ไขพนักงาน (เพิ่ม status 4 สถานะ + 4 สายงาน + Role + รูปภาพ)
  const [editingEmpDocId, setEditingEmpDocId] = useState(null); //[cite: 4]
  const [newEmpId, setNewEmpId] = useState(''); //[cite: 4]
  const [newEmpName, setNewEmpName] = useState(''); //[cite: 4]
  const [newEmpPosition, setNewEmpPosition] = useState(''); //[cite: 4]
  const [newEmpPhoto, setNewEmpPhoto] = useState(''); //[cite: 4]
  const [newEmpStatus, setNewEmpStatus] = useState('COUNTER'); // COUNTER | OTHER_SERVICE | SUPERVISOR | MANAGER
  const [newEmpDepartment, setNewEmpDepartment] = useState('SERVICE'); // SERVICE, ADMIN, PRODUCTION, REVENUE
  const [newEmpRole, setNewEmpRole] = useState('STAFF'); // STAFF, SERVICE_HEAD, ADMIN_HEAD, PRODUCTION_HEAD, REVENUE_HEAD, MANAGER, REPORT_OFFICER

  // Form States: เพิ่ม/แก้ไขหัวข้อการประเมิน[cite: 4]
  const [editingCriteriaId, setEditingCriteriaId] = useState(null); //[cite: 4]
  const [newCriteriaTitle, setNewCriteriaTitle] = useState(''); //[cite: 4]

  // Report Filter States[cite: 4]
  const [reportPeriod, setReportPeriod] = useState('daily'); // 'daily' | 'monthly' | 'yearly' | 'all'[cite: 4]
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all'); //[cite: 4]

  // โหลดฟอนต์ภาษาไทยจาก Google Fonts และข้อมูลเบื้องต้น
  useEffect(() => {
    const fontId = 'google-thai-fonts-link';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Prompt:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }

    fetchStaffs(); //[cite: 4]
    fetchCriteria(); //[cite: 4]
  }, []);

  const fetchStaffs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "employees")); //[cite: 4]
      const list = querySnapshot.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          ...data,
          status: data.status || 'COUNTER'
        };
      });
      setStaffList(list); //[cite: 4]
    } catch (err) {
      console.error("Error fetching employees:", err); //[cite: 4]
    }
  };

  const fetchCriteria = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "criteria")); //[cite: 4]
      const list = querySnapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })); //[cite: 4]
      list.sort((a, b) => (a.order || 0) - (b.order || 0)); //[cite: 4]
      setCriteriaList(list); //[cite: 4]
    } catch (err) {
      console.error("Error fetching criteria:", err); //[cite: 4]
    }
  };

  const fetchEvaluations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "evaluations")); //[cite: 4]
      const list = querySnapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })); //[cite: 4]
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); //[cite: 4]
      setEvaluationsList(list); //[cite: 4]
    } catch (err) {
      console.error("Error fetching evaluations:", err); //[cite: 4]
    }
  };

  const requestFullScreen = () => {
    const elem = document.documentElement; //[cite: 4]
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log(err)); //[cite: 4]
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen(); //[cite: 4]
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen(); //[cite: 4]
    }
  };

  // รายชื่อพนักงานเฉพาะสถานะ "ประจำเคาน์เตอร์" สำหรับแสดงบนหน้าแรกให้ประชาชนเลือก
  const counterStaffList = staffList.filter((emp) => (emp.status || 'COUNTER') === 'COUNTER');

  // เมื่อประชาชนเลือกรูปพนักงานประจำเคาน์เตอร์จากหน้าแรก
  const handleSelectCounterStaff = (staff) => {
    setErrorMsg('');
    setInputEmpId(String(staff.employeeId || ''));
    setCurrentStaff(staff);
    setServiceType('counter');
    setCounterOverallScore(null);
    setScores({});
    setComment('');
    setStep('evaluating');
    requestFullScreen();
  };

  // เข้าสู่ระบบพนักงานด้วยรหัสพนักงาน (รองรับกรณีเรียกใช้งาน)
  const handleLogin = (e) => {
    e.preventDefault(); //[cite: 4]
    setErrorMsg(''); //[cite: 4]
    const foundStaff = staffList.find(
      (staff) => String(staff.employeeId).trim() === String(inputEmpId).trim() //[cite: 4]
    );

    if (foundStaff) {
      setCurrentStaff(foundStaff); //[cite: 4]
      setStep('evaluating'); //[cite: 4]
      requestFullScreen(); //[cite: 4]
    } else {
      setErrorMsg('ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง'); //[cite: 4]
    }
  };

  // ส่งผลการประเมิน[cite: 4]
  const handleSubmitScore = async (e) => {
    e.preventDefault(); //[cite: 4]

    if (serviceType === 'counter' && !counterOverallScore) {
      alert("กรุณาเลือกระดับความพึงพอใจก่อนยืนยันครับ"); //[cite: 4]
      return; //[cite: 4]
    }

    try {
      await addDoc(collection(db, "evaluations"), {
        employeeId: currentStaff ? currentStaff.employeeId : 'COUNTER',
        employeeName: currentStaff ? currentStaff.name : 'เคาน์เตอร์บริการ',
        staffStatus: currentStaff ? (currentStaff.status || 'COUNTER') : 'COUNTER',
        department: currentStaff ? currentStaff.department : 'SERVICE',
        serviceType: serviceType, //[cite: 4]
        scores: serviceType === 'counter' ? { overall: counterOverallScore } : scores, //[cite: 4]
        comment, //[cite: 4]
        createdAt: new Date().toISOString() //[cite: 4]
      });
      setStep('success'); //[cite: 4]
      setTimeout(() => {
        setStep('login');
        setCurrentStaff(null);
        setScores({}); //[cite: 4]
        setCounterOverallScore(null); //[cite: 4]
        setComment(''); //[cite: 4]
      }, 2000); //[cite: 4]
    } catch (error) {
      console.error("Error submitting score: ", error); //[cite: 4]
    }
  };

  // เข้าสู่ระบบ Admin ด้วยรหัสพนักงานแต่ละคน
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const inputCode = String(adminPin).trim();
    const foundStaff = staffList.find(
      (staff) => String(staff.employeeId).trim() === inputCode
    );

    if (foundStaff && foundStaff.role && foundStaff.role !== 'STAFF') {
      setCurrentAdminUser(foundStaff);
      setStep('admin-dashboard');
      fetchEvaluations();
      setAdminPin('');
    } else if (foundStaff) {
      setErrorMsg('รหัสพนักงานนี้ไม่มีสิทธิ์เข้าใช้งานระบบ Admin');
    } else {
      setErrorMsg('ไม่พบรหัสพนักงานนี้ในระบบ หรือไม่มีสิทธิ์เข้าใช้งานระบบ Admin');
    }
  };

  // ออกจากระบบ Admin
  const handleAdminLogout = () => {
    setCurrentAdminUser(null);
    setAdminPin('');
    setErrorMsg('');
    setSelectedStaffFilter('all');
    setCurrentPage(1);
    setOpenGraphId(null);
    setStep('login');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0]; //[cite: 4]
    if (file) {
      const reader = new FileReader(); //[cite: 4]
      reader.onloadend = () => {
        setNewEmpPhoto(reader.result); //[cite: 4]
      };
      reader.readAsDataURL(file); //[cite: 4]
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault(); //[cite: 4]
    if (!newEmpId || !newEmpName) return; //[cite: 4]

    const empData = {
      employeeId: isNaN(Number(newEmpId)) ? newEmpId : Number(newEmpId), //[cite: 4]
      name: newEmpName, //[cite: 4]
      position: newEmpPosition || "เจ้าหน้าที่บริการ", //[cite: 4]
      status: newEmpStatus, // COUNTER | OTHER_SERVICE | SUPERVISOR | MANAGER
      department: newEmpDepartment, // SERVICE, ADMIN, PRODUCTION, REVENUE
      role: newEmpRole, // STAFF, SERVICE_HEAD, ADMIN_HEAD, PRODUCTION_HEAD, REVENUE_HEAD, MANAGER, REPORT_OFFICER
      photoUrl:
        newEmpPhoto ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop&crop=faces" //[cite: 4]
    };

    try {
      if (editingEmpDocId) {
        await updateDoc(doc(db, "employees", editingEmpDocId), empData); //[cite: 4]
      } else {
        await addDoc(collection(db, "employees"), empData); //[cite: 4]
      }
      resetEmpForm(); //[cite: 4]
      fetchStaffs(); //[cite: 4]
    } catch (err) {
      console.error("Error saving employee:", err); //[cite: 4]
    }
  };

  const handleStartEditEmployee = (emp) => {
    setEditingEmpDocId(emp.id); //[cite: 4]
    setNewEmpId(emp.employeeId); //[cite: 4]
    setNewEmpName(emp.name); //[cite: 4]
    setNewEmpPosition(emp.position || ''); //[cite: 4]
    setNewEmpPhoto(emp.photoUrl || ''); //[cite: 4]
    setNewEmpStatus(emp.status || 'COUNTER');
    setNewEmpDepartment(emp.department || 'SERVICE');
    setNewEmpRole(emp.role || 'STAFF');
  };

  const resetEmpForm = () => {
    setEditingEmpDocId(null); //[cite: 4]
    setNewEmpId(''); //[cite: 4]
    setNewEmpName(''); //[cite: 4]
    setNewEmpPosition(''); //[cite: 4]
    setNewEmpPhoto(''); //[cite: 4]
    setNewEmpStatus('COUNTER');
    setNewEmpDepartment('SERVICE');
    setNewEmpRole('STAFF');
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm("คุณต้องการลบข้อมูลพนักงานคนนี้ใช่หรือไม่?")) {
      try {
        await deleteDoc(doc(db, "employees", id)); //[cite: 4]
        if (editingEmpDocId === id) resetEmpForm(); //[cite: 4]
        fetchStaffs(); //[cite: 4]
      } catch (err) {
        console.error("Error deleting employee:", err); //[cite: 4]
      }
    }
  };

  const handleSaveCriteria = async (e) => {
    e.preventDefault(); //[cite: 4]
    if (!newCriteriaTitle.trim()) return; //[cite: 4]

    try {
      if (editingCriteriaId) {
        await updateDoc(doc(db, "criteria", editingCriteriaId), {
          title: newCriteriaTitle //[cite: 4]
        });
      } else {
        await addDoc(collection(db, "criteria"), {
          title: newCriteriaTitle, //[cite: 4]
          active: true, //[cite: 4]
          order: criteriaList.length + 1 //[cite: 4]
        });
      }
      resetCriteriaForm(); //[cite: 4]
      fetchCriteria(); //[cite: 4]
    } catch (err) {
      console.error("Error saving criteria:", err); //[cite: 4]
    }
  };

  const handleToggleCriteriaActive = async (crit) => {
    const currentActiveState = crit.active !== false; //[cite: 4]
    try {
      await updateDoc(doc(db, "criteria", crit.id), {
        active: !currentActiveState //[cite: 4]
      });
      fetchCriteria(); //[cite: 4]
    } catch (err) {
      console.error("Error toggling criteria active state:", err); //[cite: 4]
    }
  };

  const handleStartEditCriteria = (crit) => {
    setEditingCriteriaId(crit.id); //[cite: 4]
    setNewCriteriaTitle(crit.title); //[cite: 4]
  };

  const resetCriteriaForm = () => {
    setEditingCriteriaId(null); //[cite: 4]
    setNewCriteriaTitle(''); //[cite: 4]
  };

  const handleDeleteCriteria = async (id) => {
    if (window.confirm("คุณต้องการลบหัวข้อการประเมินนี้ใช่หรือไม่?")) {
      try {
        await deleteDoc(doc(db, "criteria", id)); //[cite: 4]
        if (editingCriteriaId === id) resetCriteriaForm(); //[cite: 4]
        fetchCriteria(); //[cite: 4]
      } catch (err) {
        console.error("Error deleting criteria:", err); //[cite: 4]
      }
    }
  };

  const getFilteredEvaluations = () => {
    const now = new Date(); //[cite: 4]
    return evaluationsList.filter((item) => {
      if (selectedStaffFilter !== 'all' && String(item.employeeId) !== String(selectedStaffFilter)) {
        return false; //[cite: 4]
      }
      if (!item.createdAt) return true; //[cite: 4]
      const itemDate = new Date(item.createdAt); //[cite: 4]
      if (reportPeriod === 'daily') {
        return itemDate.toDateString() === now.toDateString(); //[cite: 4]
      } else if (reportPeriod === 'monthly') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear(); //[cite: 4]
      } else if (reportPeriod === 'yearly') {
        return itemDate.getFullYear() === now.getFullYear(); //[cite: 4]
      }
      return true; //[cite: 4]
    });
  };

  const filteredData = getFilteredEvaluations(); //[cite: 4]

  // คำนวณสถิติรายงานทั้งหมด (รวมทั้งรายงานเคาน์เตอร์แยกต่างหาก)[cite: 4]
  const calculateReportStats = () => {
    const totalEvals = filteredData.length; //[cite: 4]

    // สถิติเฉพาะเคาน์เตอร์รับบริการ[cite: 4]
    const counterReport = {
      title: 'ความพึงพอใจในการรับบริการครั้งนี้', //[cite: 4]
      scoresCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, //[cite: 4]
      totalScoreSum: 0, //[cite: 4]
      ratedCount: 0 //[cite: 4]
    };

    const criteriaStats = {}; //[cite: 4]
    criteriaList.forEach((crit) => {
      criteriaStats[crit.id] = {
        id: crit.id, //[cite: 4]
        title: crit.title, //[cite: 4]
        scoresCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, //[cite: 4]
        totalScoreSum: 0, //[cite: 4]
        ratedCount: 0 //[cite: 4]
      };
    });

    const staffScoreMap = {}; //[cite: 4]

    filteredData.forEach((item) => {
      const empId = item.employeeId; //[cite: 4]
      if (!staffScoreMap[empId]) {
        staffScoreMap[empId] = { name: item.employeeName, totalScore: 0, count: 0 }; //[cite: 4]
      }

      if (item.scores) {
        if (item.serviceType === 'counter' || item.scores.overall) {
          const score = item.scores.overall; //[cite: 4]
          if (score >= 1 && score <= 5) {
            counterReport.scoresCount[score] += 1; //[cite: 4]
            counterReport.totalScoreSum += score; //[cite: 4]
            counterReport.ratedCount += 1; //[cite: 4]

            staffScoreMap[empId].totalScore += score; //[cite: 4]
            staffScoreMap[empId].count += 1; //[cite: 4]
          }
        } else {
          Object.entries(item.scores).forEach(([critId, score]) => {
            if (criteriaStats[critId]) {
              if (score >= 1 && score <= 5) {
                criteriaStats[critId].scoresCount[score] += 1; //[cite: 4]
                criteriaStats[critId].totalScoreSum += score; //[cite: 4]
                criteriaStats[critId].ratedCount += 1; //[cite: 4]
              }
            }
            staffScoreMap[empId].totalScore += score; //[cite: 4]
            staffScoreMap[empId].count += 1; //[cite: 4]
          });
        }
      }
    });

    const staffRanking = Object.entries(staffScoreMap)
      .map(([empId, data]) => {
        const avg = data.count > 0 ? data.totalScore / data.count : 0; //[cite: 4]
        return { ...data, empId, avg }; //[cite: 4]
      })
      .sort((a, b) => b.avg - a.avg); //[cite: 4]

    let topCriteria = null; //[cite: 4]
    let lowestCriteria = null; //[cite: 4]
    let maxCritAvg = -1; //[cite: 4]
    let minCritAvg = 999; //[cite: 4]

    Object.values(criteriaStats).forEach((crit) => {
      if (crit.ratedCount > 0) {
        const avg = crit.totalScoreSum / crit.ratedCount; //[cite: 4]
        if (avg > maxCritAvg) {
          maxCritAvg = avg; //[cite: 4]
          topCriteria = { ...crit, avg }; //[cite: 4]
        }
        if (avg < minCritAvg) {
          minCritAvg = avg; //[cite: 4]
          lowestCriteria = { ...crit, avg }; //[cite: 4]
        }
      }
    });

    const topStaff = staffRanking.length > 0 ? staffRanking[0] : null; //[cite: 4]

    return { totalEvals, counterReport, criteriaStats, topStaff, staffRanking, topCriteria, lowestCriteria }; //[cite: 4]
  };

  const reportStats = calculateReportStats(); //[cite: 4]

  // คำนวณข้อมูลสำหรับ Pagination ของตารางประวัติ[cite: 4]
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1; //[cite: 4]
  const indexOfLastRow = currentPage * rowsPerPage; //[cite: 4]
  const indexOfFirstRow = indexOfLastRow - rowsPerPage; //[cite: 4]
  const currentTableData = filteredData.slice(indexOfFirstRow, indexOfLastRow); //[cite: 4]

  const handlePeriodChange = (e) => {
    setReportPeriod(e.target.value); //[cite: 4]
    setCurrentPage(1); //[cite: 4]
  };

  const handleStaffFilterChange = (e) => {
    setSelectedStaffFilter(e.target.value); //[cite: 4]
    setCurrentPage(1); //[cite: 4]
  };

  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; //[cite: 4]
    csvContent += "=== ประวัติการประเมินย้อนหลัง ===\n"; //[cite: 4]
    csvContent += "วันที่-เวลา,ประเภทบริการ,รหัสพนักงาน,ชื่อพนักงาน,ข้อเสนอแนะ,คะแนนรวม\n"; //[cite: 4]

    filteredData.forEach((item) => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'; //[cite: 4]
      const serviceTypeName = item.serviceType === 'other' ? 'อื่นๆ' : 'เคาน์เตอร์รับบริการ'; //[cite: 4]
      const totalScore = item.scores ? Object.values(item.scores).reduce((a, b) => a + b, 0) : 0; //[cite: 4]
      const cleanComment = (item.comment || '').replace(/"/g, '""'); //[cite: 4]
      csvContent += `"${dateStr}","${serviceTypeName}","${item.employeeId}","${item.employeeName}","${cleanComment}",${totalScore}\n`; //[cite: 4]
    });

    csvContent += "\n=== สรุปอันดับคะแนนพนักงาน (เรียงจากมากไปน้อย) ===\n"; //[cite: 4]
    csvContent += "อันดับ,รหัสพนักงาน,ชื่อพนักงาน,จำนวนครั้งที่รับประเมิน,คะแนนเฉลี่ย (เต็ม 5.00)\n"; //[cite: 4]

    reportStats.staffRanking.forEach((staff, idx) => {
      csvContent += `${idx + 1},"${staff.empId}","${staff.name}",${staff.count},${staff.avg.toFixed(2)}\n`; //[cite: 4]
    });

    const encodedUri = encodeURI(csvContent); //[cite: 4]
    const link = document.createElement("a"); //[cite: 4]
    link.setAttribute("href", encodedUri); //[cite: 4]
    link.setAttribute("download", `รายงานการประเมิน_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`); //[cite: 4]
    document.body.appendChild(link); //[cite: 4]
    link.click(); //[cite: 4]
    document.body.removeChild(link); //[cite: 4]
  };

  const exportToPDF = () => {
    const staffName =
      selectedStaffFilter === 'all'
        ? 'ภาพรวมพนักงานทุกคนรวมกัน' //[cite: 4]
        : staffList.find((s) => String(s.employeeId) === String(selectedStaffFilter))?.name ||
          selectedStaffFilter; //[cite: 4]

    const printWindow = window.open('', '_blank', 'width=950,height=800'); //[cite: 4]

    let criteriaSummaryHTML = ''; //[cite: 4]

    if (reportStats.counterReport.ratedCount > 0) {
      const ratedC = reportStats.counterReport.ratedCount; //[cite: 4]
      const cAvg = (reportStats.counterReport.totalScoreSum / ratedC).toFixed(2); //[cite: 4]
      criteriaSummaryHTML += `
        <div style="margin-bottom: 16px; background: #e0f2fe; border: 1px solid #7dd3fc; padding: 12px; border-radius: 10px;">
          <b style="font-size: 14px; color: #0369a1;">🏢 เคาน์เตอร์รับบริการ: ${reportStats.counterReport.title}</b>
          <span style="float: right; background: #0284c7; color: white; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">คะแนนเฉลี่ย: ${cAvg} / 5.00</span>
          <div style="margin-top: 8px; font-size: 11px;">
            ประเมินทั้งหมด: ${ratedC} ครั้ง
          </div>
        </div>
      `; //[cite: 4]
    }

    Object.values(reportStats.criteriaStats).forEach((stat, idx) => {
      const rated = stat.ratedCount || 1; //[cite: 4]
      const avg = (stat.totalScoreSum / rated).toFixed(2); //[cite: 4]

      criteriaSummaryHTML += `
        <div style="margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <b style="font-size: 13px; color: #0f172a;">${idx + 1}. ${stat.title}</b>
            <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">คะแนนเฉลี่ย: ${avg} / 5.00</span>
          </div>
        </div>
      `; //[cite: 4]
    });

    let staffRankingHTML = ''; //[cite: 4]
    reportStats.staffRanking.forEach((staff, idx) => {
      staffRankingHTML += `
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;"><b>อันดับ ${idx + 1}</b></td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${staff.name} (${staff.empId})</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${staff.count} ครั้ง</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7;">${staff.avg.toFixed(2)} / 5.00</td>
        </tr>
      `; //[cite: 4]
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>รายงานสรุปผลการประเมิน - การประปาส่วนภูมิภาคสาขานครพนม</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" />
          <style>
            body { font-family: ${THAI_FONT_STACK}; padding: 20px; color: #0f172a; line-height: 1.5; }
            h1 { font-size: 18px; margin-bottom: 5px; color: #0369a1; }
            h2 { font-size: 14px; margin-top: 15px; color: #0284c7; border-bottom: 2px solid #bae6fd; padding-bottom: 4px; }
            p { font-size: 12px; color: #64748b; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
            th { background: #f1f5f9; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          </style>
        </head>
        <body>
          <h1>💧 รายงานสรุปผลการประเมินความพึงพอใจ (การประปาส่วนภูมิภาคสาขานครพนม)</h1>
          <p>ช่วงเวลา: <b>${reportPeriod.toUpperCase()}</b> | พนักงาน: <b>${staffName}</b> | จำนวนผู้ประเมินรวม: <b>${reportStats.totalEvals} ราย</b></p>
          
          <h2>🏆 สรุปจัดอันดับพนักงานเรียงตามคะแนนความพึงพอใจ</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">อันดับ</th>
                <th>ชื่อ-นามสกุล (รหัส)</th>
                <th style="text-align: center;">จำนวนประเมิน</th>
                <th style="text-align: center;">คะแนนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              ${staffRankingHTML || '<tr><td colspan="4" style="text-align:center;">ไม่มีข้อมูลพนักงาน</td></tr>'}
            </tbody>
          </table>

          <h2>📊 สรุปผลคะแนนประเมินแยกตามประเภท/หัวข้อ</h2>
          ${criteriaSummaryHTML || '<p>ยังไม่มีข้อมูลหัวข้อประเมิน</p>'}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `); //[cite: 4]
    printWindow.document.close(); //[cite: 4]
  };

  // 🌟 ไอคอนประเมิน 5 ระดับ (เรียงลำดับขนาดจากเล็กไปใหญ่)[cite: 4]
  const emotionLevels5 = [
    { score: 1, emoji: '😡', label: 'พอใจน้อยมาก', sizeClass: 'text-xl sm:text-2xl md:text-3xl' }, //[cite: 4]
    { score: 2, emoji: '🙁', label: 'พอใจน้อย', sizeClass: 'text-2xl sm:text-3xl md:text-4xl' }, //[cite: 4]
    { score: 3, emoji: '😐', label: 'พอใจปานกลาง', sizeClass: 'text-3xl sm:text-4xl md:text-5xl' }, //[cite: 4]
    { score: 4, emoji: '😊', label: 'พอใจมาก', sizeClass: 'text-4xl sm:text-5xl md:text-6xl' }, //[cite: 4]
    { score: 5, emoji: '😍', label: 'พอใจมากที่สุด', sizeClass: 'text-5xl sm:text-6xl md:text-7xl' } //[cite: 4]
  ];

  const visibleCriteriaList = criteriaList.filter((crit) => crit.active !== false); //[cite: 4]

  return (
    <div
      style={{ fontFamily: THAI_FONT_STACK }}
      className="min-h-screen w-screen bg-sky-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto antialiased"
    >
      {/* 1. หน้าแรกสำหรับประชาชนทั่วไป: แสดงรูปพนักงานที่มีสถานะ "ประจำเคาน์เตอร์" ทั้งหมด */}
      {step === 'login' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-sky-100 max-w-4xl w-full text-center relative">
          <div className="mb-3">
            <img
              src={pwaLogo}
              alt="โลโก้ กปภ."
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto object-contain drop-shadow-md" //[cite: 4]
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-sky-900 mb-1 leading-snug">
            <p className="text-sm sm:text-base text-sky-600/80 mb-6">
            กรุณาเลือกพนักงาน{' '}
            <span className="font-bold text-emerald-700">ประจำเคาน์เตอร์</span>{' '}
            ที่ท่านเข้ารับบริการเพื่อประเมินความพึงพอใจ
          </p>
          </h2>
          

          {counterStaffList.length === 0 ? (
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-8 text-sky-700 text-sm">
              ยังไม่มีรายชื่อพนักงานที่มีสถานะ "ประจำเคาน์เตอร์" ในระบบ
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-center">
              {counterStaffList.map((staff) => (
                <button
                  type="button"
                  key={staff.id}
                  onClick={() => handleSelectCounterStaff(staff)}
                  className="group bg-sky-50/60 hover:bg-sky-600 border border-sky-200 hover:border-sky-600 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-lg flex flex-col items-center"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-md mb-3 group-hover:scale-105 transition-transform">
                    <img
                      src={
                        staff.photoUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop&crop=faces"
                      }
                      alt={staff.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold text-sm sm:text-base text-sky-950 group-hover:text-white line-clamp-1">
                    {staff.name}
                  </span>
                  <span className="text-xs text-sky-600 group-hover:text-sky-100 mt-0.5 line-clamp-1">
                    {staff.position || 'เจ้าหน้าที่ประจำเคาน์เตอร์'}
                  </span>
                  <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 group-hover:bg-white group-hover:text-sky-700">
                    กดเพื่อประเมิน
                  </span>
                </button>
              ))}
            </div>
          )}

          {errorMsg && <p className="text-red-500 text-xs sm:text-sm font-medium mt-4">{errorMsg}</p>}

          <div className="mt-8 pt-4 border-t border-sky-100 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setStep('admin-login');
                setErrorMsg('');
              }}
              className="text-xs sm:text-sm text-sky-600 hover:text-sky-800 font-medium transition"
            >
              ⚙️ เข้าสู่ระบบผู้ดูแลระบบ (Admin)
            </button>
          </div>
        </div>
      )}

      {/* 🔒 2. หน้าจอ Login Admin (ใช้รหัสพนักงานแต่ละคนเท่านั้น) */}
      {step === 'admin-login' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-sky-100 max-w-md w-full text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-sky-800 rounded-3xl mx-auto flex items-center justify-center text-white text-2xl sm:text-3xl mb-4 shadow-md">
            🔒
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-900 mb-2">ผู้ดูแลระบบ (Admin)</h2>
          <p className="text-sm sm:text-base text-sky-600/70 mb-6">
            กรอกรหัสพนักงานที่มีสิทธิ์เข้าใช้งานระบบ Admin
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              placeholder="กรอกรหัสพนักงาน Admin"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-sky-200 bg-sky-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-lg sm:text-xl font-semibold tracking-wider text-sky-900"
              required
            />
            {errorMsg && <p className="text-red-500 text-xs sm:text-sm font-medium">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full bg-sky-800 text-white py-3.5 rounded-2xl font-semibold hover:bg-sky-900 transition shadow-lg text-base sm:text-lg"
            >
              เข้าสู่ระบบ Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('login');
                setErrorMsg('');
              }}
              className="w-full text-sky-600 py-2 text-sm sm:text-base hover:underline"
            >
              กลับหน้าหลัก
            </button>
          </form>
        </div>
      )}

      {/* 📊 3. หน้าจอ Admin Dashboard หลัก */}
      {step === 'admin-dashboard' && (
        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-sky-100 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-sky-100 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-sky-900">
                สำหรับผู้ดูแลระบบ {currentAdminUser?.name ? `• ${currentAdminUser.name}` : ''}
              </h2>
              <p className="text-xs sm:text-sm text-sky-600">
                {currentAdminUser?.role ? `สิทธิ์: ${currentAdminUser.role} • ` : ''}
                จัดการข้อมูลพนักงาน หัวข้อการประเมิน และรายงานสรุป
              </p>
            </div>

            <div className="flex flex-wrap bg-sky-50 p-1.5 rounded-2xl border border-sky-100 gap-1">
              <button
                onClick={() => setActiveAdminTab('reports')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeAdminTab === 'reports'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-700 hover:bg-sky-100'
                }`}
              >
                📊 รายงานผล
              </button>
              <button
                onClick={() => setActiveAdminTab('employees')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeAdminTab === 'employees'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-700 hover:bg-sky-100'
                }`}
              >
                👥 พนักงาน (4 สถานะ)
              </button>
              <button
                onClick={() => setActiveAdminTab('criteria')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeAdminTab === 'criteria'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-700 hover:bg-sky-100'
                }`}
              >
                📝 หัวข้อประเมิน
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-500 hover:bg-red-50 transition"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* TAB 1: รายงานการประเมิน (ยึดตามโค้ด app_4.txt ทั้งหมด)[cite: 4] */}
          {activeAdminTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-sky-900 mb-1">
                    ช่วงเวลาสั่งสรุปรายงาน
                  </label>
                  <select
                    value={reportPeriod}
                    onChange={handlePeriodChange}
                    className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm bg-white text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="daily">📅 ประจำวัน (วันนี้)</option>
                    <option value="monthly">📆 ประจำเดือน (เดือนนี้)</option>
                    <option value="yearly">🗓️ ประจำปี (ปีนี้)</option>
                    <option value="all">♾️ ทั้งหมด</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sky-900 mb-1">
                    เลือกพนักงาน
                  </label>
                  <select
                    value={selectedStaffFilter}
                    onChange={handleStaffFilterChange}
                    className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm bg-white text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="all">👥 ภาพรวมพนักงานทุกคนรวมกัน</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.employeeId}>
                        👤 {s.name} ({s.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <button
                    onClick={exportToExcel}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm py-2.5 px-3 rounded-xl font-semibold transition shadow-md flex items-center justify-center gap-1"
                  >
                    📥 Export Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex-1 bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm py-2.5 px-3 rounded-xl font-semibold transition shadow-md flex items-center justify-center gap-1"
                  >
                    🖨️ เปิดรายงาน PDF
                  </button>
                </div>
              </div>

              {/* 📌 สรุปจำนวนผู้ประเมินตามช่วงเวลา[cite: 4] */}
              <div className="bg-sky-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs text-sky-100 font-medium">
                    สถิติจำนวนผู้ทำรายการประเมิน (
                    {reportPeriod === 'daily'
                      ? 'ประจำวัน'
                      : reportPeriod === 'monthly'
                      ? 'ประจำเดือน'
                      : reportPeriod === 'yearly'
                      ? 'ประจำปี'
                      : 'ทั้งหมด'}
                    )
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-0.5">
                    {reportStats.totalEvals} <span className="text-sm font-normal">ราย</span>
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900 mb-1">
                    💚 หัวข้อที่ลูกค้าพึงพอใจมากที่สุด
                  </h4>
                  {reportStats.topCriteria ? (
                    <div className="text-xs sm:text-sm text-emerald-800 space-y-1">
                      <p>
                        <b>หัวข้อ:</b> {reportStats.topCriteria.title}
                      </p>
                      <p>
                        <b>คะแนนเฉลี่ย:</b> {reportStats.topCriteria.avg.toFixed(2)} / 5.00 คะแนน
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีข้อมูลการประเมิน</p>
                  )}
                </div>

                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-900 mb-1">
                    💔 หัวข้อที่ลูกค้าพึงพอใจน้อยที่สุด
                  </h4>
                  {reportStats.lowestCriteria ? (
                    <div className="text-xs sm:text-sm text-rose-800 space-y-1">
                      <p>
                        <b>หัวข้อ:</b> {reportStats.lowestCriteria.title}
                      </p>
                      <p>
                        <b>คะแนนเฉลี่ย:</b> {reportStats.lowestCriteria.avg.toFixed(2)} / 5.00 คะแนน
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีข้อมูลการประเมิน</p>
                  )}
                </div>
              </div>

              {/* 🏢 สรุปรายงานเฉพาะ "เคาน์เตอร์รับบริการ"[cite: 4] */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-300 shadow-sm space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2 flex items-center justify-between">
                  <span>🏢 รายงานผลการประเมิน: เคาน์เตอร์รับบริการ</span>
                  <span className="text-xs font-normal text-sky-600">หัวข้อประเมินหลัก</span>
                </h3>

                {reportStats.counterReport.ratedCount === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    ยังไม่มีข้อมูลการประเมินจากเคาน์เตอร์รับบริการ
                  </p>
                ) : (
                  (() => {
                    const cReport = reportStats.counterReport;
                    const rated = cReport.ratedCount || 1;
                    const p1 = Number(((cReport.scoresCount[1] / rated) * 100).toFixed(1));
                    const p2 = Number(((cReport.scoresCount[2] / rated) * 100).toFixed(1));
                    const p3 = Number(((cReport.scoresCount[3] / rated) * 100).toFixed(1));
                    const p4 = Number(((cReport.scoresCount[4] / rated) * 100).toFixed(1));
                    const p5 = Number(((cReport.scoresCount[5] / rated) * 100).toFixed(1));
                    const avg = (cReport.totalScoreSum / rated).toFixed(2);
                    const isGraphOpen = openGraphId === 'counter_report_graph';

                    return (
                      <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-3">
                        <div className="flex justify-between items-center text-xs sm:text-sm flex-wrap gap-2">
                          <span className="font-bold text-sky-950">📌 {cReport.title}</span>

                          <div className="flex items-center space-x-2">
                            <span className="bg-sky-600 text-white px-3 py-1 rounded-lg font-extrabold text-xs">
                              คะแนนเฉลี่ย: {avg} / 5.00
                            </span>

                            <button
                              onClick={() =>
                                setOpenGraphId(isGraphOpen ? null : 'counter_report_graph')
                              }
                              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
                                isGraphOpen
                                  ? 'bg-sky-800 text-white'
                                  : 'bg-white text-sky-700 border border-sky-300 hover:bg-sky-100'
                              }`}
                            >
                              <span>📊</span>
                              <span>{isGraphOpen ? 'ซ่อนกราฟ' : 'ดูแสดงกราฟ'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] sm:text-xs">
                          <div className="bg-white p-2 rounded-lg border border-red-100 text-red-700">
                            😡 น้อยมาก: <b>{cReport.scoresCount[1]} คน</b> ({p1}%)
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-orange-100 text-orange-700">
                            🙁 น้อย: <b>{cReport.scoresCount[2]} คน</b> ({p2}%)
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-amber-100 text-amber-700">
                            😐 ปานกลาง: <b>{cReport.scoresCount[3]} คน</b> ({p3}%)
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-sky-100 text-sky-700">
                            😊 มาก: <b>{cReport.scoresCount[4]} คน</b> ({p4}%)
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-emerald-100 text-emerald-700">
                            😍 มากที่สุด: <b>{cReport.scoresCount[5]} คน</b> ({p5}%)
                          </div>
                        </div>

                        {isGraphOpen && (
                          <div className="bg-white p-4 rounded-xl border border-sky-200 mt-2 space-y-2.5">
                            <p className="text-xs font-bold text-sky-900 border-b border-sky-100 pb-1">
                              📈 กราฟแท่งแสดงระดับความพึงพอใจเคาน์เตอร์รับบริการ
                            </p>

                            <div className="space-y-2 text-xs">
                              <div>
                                <div className="flex justify-between mb-0.5 text-red-700 font-semibold">
                                  <span>😡 พอใจน้อยมาก</span>
                                  <span>
                                    {p1}% ({cReport.scoresCount[1]} คน)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${p1}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5 text-orange-700 font-semibold">
                                  <span>🙁 พอใจน้อย</span>
                                  <span>
                                    {p2}% ({cReport.scoresCount[2]} คน)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${p2}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5 text-amber-700 font-semibold">
                                  <span>😐 พอใจปานกลาง</span>
                                  <span>
                                    {p3}% ({cReport.scoresCount[3]} คน)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${p3}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5 text-sky-700 font-semibold">
                                  <span>😊 พอใจมาก</span>
                                  <span>
                                    {p4}% ({cReport.scoresCount[4]} คน)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-sky-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${p4}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5 text-emerald-700 font-semibold">
                                  <span>😍 พอใจมากที่สุด</span>
                                  <span>
                                    {p5}% ({cReport.scoresCount[5]} คน)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${p5}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2">
                  🏆 สรุปอันดับพนักงานเรียงตามคะแนนความพึงพอใจ (จากมากไปน้อย)
                </h3>

                {reportStats.staffRanking.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    ยังไม่มีข้อมูลการประเมินพนักงาน
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reportStats.staffRanking.map((staff, idx) => (
                      <div
                        key={staff.empId}
                        className="flex items-center justify-between p-3 bg-sky-50/50 rounded-xl border border-sky-100"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              idx === 0
                                ? 'bg-amber-500'
                                : idx === 1
                                ? 'bg-slate-400'
                                : idx === 2
                                ? 'bg-amber-700'
                                : 'bg-sky-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-sky-900">{staff.name}</p>
                            <p className="text-[10px] text-sky-600">
                              รหัส: {staff.empId} | ประเมิน {staff.count} ครั้ง
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-sky-800 bg-white px-2 py-1 rounded-lg border border-sky-200 shadow-2xs">
                          {staff.avg.toFixed(2)} / 5.0
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* สรุปกราฟสถิติหัวข้ออื่นๆ[cite: 4] */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2">
                  📊 สรุปผลการประเมินแยกตามหัวข้ออื่นๆ (คะแนนและเปอร์เซ็นต์)
                </h3>

                {Object.keys(reportStats.criteriaStats).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    ยังไม่มีข้อมูลหัวข้อการประเมิน
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.values(reportStats.criteriaStats).map((stat, idx) => {
                      const rated = stat.ratedCount || 1;
                      const p1 = Number(((stat.scoresCount[1] / rated) * 100).toFixed(1));
                      const p2 = Number(((stat.scoresCount[2] / rated) * 100).toFixed(1));
                      const p3 = Number(((stat.scoresCount[3] / rated) * 100).toFixed(1));
                      const p4 = Number(((stat.scoresCount[4] / rated) * 100).toFixed(1));
                      const p5 = Number(((stat.scoresCount[5] / rated) * 100).toFixed(1));
                      const avg = (stat.totalScoreSum / rated).toFixed(2);
                      const isGraphOpen = openGraphId === stat.id;

                      return (
                        <div
                          key={idx}
                          className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-100 space-y-3"
                        >
                          <div className="flex justify-between items-center text-xs sm:text-sm flex-wrap gap-2">
                            <span className="font-bold text-sky-900">
                              {idx + 1}. {stat.title}
                            </span>

                            <div className="flex items-center space-x-2">
                              <span className="bg-sky-200 text-sky-800 px-2.5 py-1 rounded-md font-bold">
                                คะแนนเฉลี่ย: {avg} / 5.00
                              </span>

                              <button
                                onClick={() => setOpenGraphId(isGraphOpen ? null : stat.id)}
                                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs ${
                                  isGraphOpen
                                    ? 'bg-sky-700 text-white'
                                    : 'bg-white text-sky-700 border border-sky-300 hover:bg-sky-100'
                                }`}
                              >
                                <span>📊</span>
                                <span>{isGraphOpen ? 'ซ่อนกราฟ' : 'ดูแสดงกราฟ'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] sm:text-xs">
                            <div className="bg-white p-2 rounded-lg border border-red-100 text-red-700">
                              😡 น้อยมาก: <b>{stat.scoresCount[1]} คน</b> ({p1}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-orange-100 text-orange-700">
                              🙁 น้อย: <b>{stat.scoresCount[2]} คน</b> ({p2}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-100 text-amber-700">
                              😐 ปานกลาง: <b>{stat.scoresCount[3]} คน</b> ({p3}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-sky-100 text-sky-700">
                              😊 มาก: <b>{stat.scoresCount[4]} คน</b> ({p4}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-emerald-100 text-emerald-700">
                              😍 มากที่สุด: <b>{stat.scoresCount[5]} คน</b> ({p5}%)
                            </div>
                          </div>

                          {isGraphOpen && (
                            <div className="bg-white p-4 rounded-xl border border-sky-200 mt-2 space-y-3">
                              <p className="text-xs font-bold text-sky-900 border-b border-sky-100 pb-1">
                                📈 กราฟแท่งเปรียบเทียบสัดส่วนเปอร์เซ็นต์การประเมิน
                              </p>

                              <div className="space-y-2 text-xs">
                                <div>
                                  <div className="flex justify-between mb-1 text-red-700 font-semibold">
                                    <span>😡 พอใจน้อยมาก</span>
                                    <span>
                                      {p1}% ({stat.scoresCount[1]} คน)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-red-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${p1}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-orange-700 font-semibold">
                                    <span>🙁 พอใจน้อย</span>
                                    <span>
                                      {p2}% ({stat.scoresCount[2]} คน)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${p2}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-amber-700 font-semibold">
                                    <span>😐 พอใจปานกลาง</span>
                                    <span>
                                      {p3}% ({stat.scoresCount[3]} คน)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${p3}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-sky-700 font-semibold">
                                    <span>😊 พอใจมาก</span>
                                    <span>
                                      {p4}% ({stat.scoresCount[4]} คน)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-sky-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${p4}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-emerald-700 font-semibold">
                                    <span>😍 พอใจมากที่สุด</span>
                                    <span>
                                      {p5}% ({stat.scoresCount[5]} คน)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${p5}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ประวัติการประเมินย้อนหลัง (10 แถว + Pagination)[cite: 4] */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs sm:text-sm font-bold text-sky-900">
                    📋 ประวัติการประเมินย้อนหลัง (แสดงหน้าละ 10 รายการ)
                  </h3>
                  <span className="text-xs text-sky-600">รวมทั้งหมด {filteredData.length} รายการ</span>
                </div>

                <div className="overflow-x-auto border border-sky-200 rounded-2xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-sky-100/70 text-sky-900 border-b border-sky-200">
                        <th className="p-3">วันที่-เวลา</th>
                        <th className="p-3">ประเภทบริการ</th>
                        <th className="p-3">รหัสพนักงาน</th>
                        <th className="p-3">ชื่อพนักงาน</th>
                        <th className="p-3">ข้อเสนอแนะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {currentTableData.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center p-8 text-sky-400">
                            ไม่พบข้อมูลการประเมินตามเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      ) : (
                        currentTableData.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-sky-50/50">
                            <td className="p-3 text-sky-900">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}
                            </td>
                            <td className="p-3 font-semibold">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] ${
                                  item.serviceType === 'other'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {item.serviceType === 'other' ? '📌 อื่นๆ' : '🏢 เคาน์เตอร์'}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-sky-800">{item.employeeId}</td>
                            <td className="p-3 font-medium text-sky-900">{item.employeeName}</td>
                            <td className="p-3 text-slate-600 italic">{item.comment || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredData.length > 0 && (
                  <div className="flex items-center justify-between pt-2 px-1">
                    <span className="text-xs text-sky-700 font-medium">
                      หน้าที่ {currentPage} จาก {totalPages} (แสดง {indexOfFirstRow + 1} -{' '}
                      {Math.min(indexOfLastRow, filteredData.length)} จาก {filteredData.length}{' '}
                      รายการ)
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          currentPage === 1
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                        }`}
                      >
                        ◀️ ก่อนหน้า
                      </button>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          currentPage === totalPages
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                        }`}
                      >
                        ถัดไป ▶️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: จัดการพนักงาน (เพิ่ม/แก้ไขสถานะ 4 แบบ + สายงาน + Role + รูปภาพ) */}
          {activeAdminTab === 'employees' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveEmployee}
                className={`p-4 rounded-2xl border transition ${
                  editingEmpDocId
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-sky-50/60 border-sky-100'
                } space-y-3`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3
                    className={`text-xs sm:text-sm font-bold ${
                      editingEmpDocId ? 'text-amber-900' : 'text-sky-900'
                    }`}
                  >
                    {editingEmpDocId ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มข้อมูลพนักงานใหม่'}
                  </h3>
                  {editingEmpDocId && (
                    <button
                      type="button"
                      onClick={resetEmpForm}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-sky-800 font-semibold mb-1">
                      รหัสพนักงาน:
                    </label>
                    <input
                      type="text"
                      placeholder="รหัสพนักงาน (เช่น 12349)"
                      value={newEmpId}
                      onChange={(e) => setNewEmpId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-sky-800 font-semibold mb-1">
                      ชื่อ-นามสกุล:
                    </label>
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุล"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-sky-800 font-semibold mb-1">
                      ตำแหน่ง:
                    </label>
                    <input
                      type="text"
                      placeholder="ตำแหน่ง (เช่น เจ้าหน้าที่บริการ)"
                      value={newEmpPosition}
                      onChange={(e) => setNewEmpPosition(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-sky-800 font-semibold mb-1">
                      สถานะพนักงาน (4 สถานะ):
                    </label>
                    <select
                      value={newEmpStatus}
                      onChange={(e) => setNewEmpStatus(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold text-sky-900"
                    >
                      {STAFF_STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-sky-800 font-semibold mb-1">
                      สายงานสังกัด:
                    </label>
                    <select
                      value={newEmpDepartment}
                      onChange={(e) => setNewEmpDepartment(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="SERVICE">สายงานบริการฯ</option>
                      <option value="ADMIN">สายงานอำนวยการ</option>
                      <option value="PRODUCTION">สายงานผลิต</option>
                      <option value="REVENUE">สายงานจัดเก็บรายได้</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-sky-800 font-semibold mb-1">
                      สิทธิ์ผู้ใช้งาน (Role):
                    </label>
                    <select
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="STAFF">พนักงานทั่วไป (รับการประเมิน)</option>
                      <option value="SERVICE_HEAD">หัวหน้างานบริการฯ</option>
                      <option value="ADMIN_HEAD">หัวหน้างานอำนวยการ</option>
                      <option value="PRODUCTION_HEAD">หัวหน้างานผลิต</option>
                      <option value="REVENUE_HEAD">หัวหน้างานจัดเก็บรายได้</option>
                      <option value="MANAGER">ผู้จัดการ (ดูทั้งหมด/ประเมินได้)</option>
                      <option value="REPORT_OFFICER">ผู้ทำรายงาน (ดูทั้งหมด/ห้ามประเมิน)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[11px] text-sky-800 font-semibold">
                    เลือกรูปภาพพนักงานจากเครื่อง:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="p-1.5 rounded-xl border border-sky-200 text-xs bg-white text-sky-900 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200"
                  />
                </div>

                {newEmpPhoto && (
                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-xs text-sky-800">รูปตัวอย่าง:</span>
                    <img
                      src={newEmpPhoto}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-sky-300 shadow-sm"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`flex-1 text-white py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm shadow-md ${
                      editingEmpDocId
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    {editingEmpDocId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลพนักงาน'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900">
                  รายชื่อพนักงานทั้งหมด ({staffList.length} คน)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staffList.map((emp) => {
                    const statusInfo = getStatusInfo(emp.status);
                    return (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between p-3 bg-white border rounded-2xl shadow-2xs transition ${
                          editingEmpDocId === emp.id
                            ? 'border-amber-400 ring-2 ring-amber-100'
                            : 'border-sky-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={emp.photoUrl}
                            alt={emp.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-sky-100 shadow-xs"
                          />
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-sky-900">{emp.name}</p>
                            <p className="text-[10px] sm:text-xs text-sky-600">
                              รหัส: {emp.employeeId} | {emp.position}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}
                              >
                                {statusInfo.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
                                {emp.role || 'STAFF'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleStartEditEmployee(emp)}
                            className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-amber-50 transition"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: จัดการหัวข้อประเมิน[cite: 4] */}
          {activeAdminTab === 'criteria' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveCriteria} className="space-y-2">
                {editingCriteriaId && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-semibold text-amber-800">
                      ✏️ กำลังแก้ไขหัวข้อการประเมิน
                    </span>
                    <button
                      type="button"
                      onClick={resetCriteriaForm}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อหัวข้อการประเมินใหม่..."
                    value={newCriteriaTitle}
                    onChange={(e) => setNewCriteriaTitle(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <button
                    type="submit"
                    className={`text-white px-5 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm shadow-md ${
                      editingCriteriaId
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    {editingCriteriaId ? 'บันทึก' : 'เพิ่มหัวข้อ'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {criteriaList.map((crit, index) => {
                  const isVisible = crit.active !== false;
                  return (
                    <div
                      key={crit.id}
                      className={`flex justify-between items-center border p-3.5 rounded-2xl transition ${
                        editingCriteriaId === crit.id
                          ? 'bg-amber-50/80 border-amber-300'
                          : isVisible
                          ? 'bg-sky-50/60 border-sky-100'
                          : 'bg-slate-100 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-semibold text-sky-900">
                          {index + 1}. {crit.title}
                        </span>
                        {!isVisible && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            (ซ่อนอยู่)
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleToggleCriteriaActive(crit)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                            isVisible
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {isVisible ? '👁️ แสดง' : '🙈 ซ่อน'}
                        </button>
                        <button
                          onClick={() => handleStartEditCriteria(crit)}
                          className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-50 transition"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteCriteria(crit.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ⭐ 4. หน้าจอประเมินความพึงพอใจสำหรับลูกค้า[cite: 4] */}
      {step === 'evaluating' && currentStaff && (
        <div className="bg-white w-screen h-screen flex flex-col justify-between p-3 sm:p-5 md:p-6 overflow-hidden relative">
          <button
            type="button"
            onClick={() => {
              if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
              setStep('login');
              setInputEmpId('');
              setCurrentStaff(null);
              setScores({});
              setCounterOverallScore(null);
              setComment('');
            }}
            className="absolute top-3 right-3 text-xs text-sky-600 hover:text-red-500 border border-sky-200 bg-sky-50 px-3 py-1.5 rounded-xl transition font-semibold z-20"
          >
            ออกจากระบบ
          </button>

          <div className="flex flex-col items-center justify-center border-b border-sky-100 pb-2 mb-2 flex-shrink-0 text-center">
            <div className="mb-2">
              <img
                src={currentStaff.photoUrl}
                alt={currentStaff.name}
                className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full object-cover shadow-xl border-4 border-sky-300 p-1 bg-white mx-auto"
              />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-sky-900 leading-tight">
              {currentStaff.name}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-sky-600 font-semibold">
              {currentStaff.position}
            </p>
            <span className="mt-1 text-[11px] sm:text-xs bg-sky-100 text-sky-800 font-semibold px-3 py-0.5 rounded-full">
              จุดบริการ:{' '}
              {serviceType === 'counter' ? '🏢 เคาน์เตอร์รับบริการ' : '📌 อื่นๆ'}
            </span>
          </div>

          <form
            onSubmit={handleSubmitScore}
            className="flex flex-col justify-between flex-1 space-y-2 overflow-hidden"
          >
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 flex flex-col justify-around">
              <div className="text-center py-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-sky-800 bg-sky-100/70 py-2 px-4 rounded-2xl shadow-2xs inline-block">
                  💧 โปรดประเมินความพึงพอใจในการรับบริการครั้งนี้ 💧
                </h3>
              </div>

              {/* 🏢 กรณีเลือก "เคาน์เตอร์รับบริการ": ซ่อนหัวข้อประเมิน ให้กดเลือก 5 ระดับภาพรวม[cite: 4] */}
              {serviceType === 'counter' ? (
                <div className="bg-sky-50/80 border border-sky-200 p-4 sm:p-6 rounded-3xl shadow-sm space-y-3">
                  <p className="text-sm sm:text-base md:text-lg font-bold text-sky-900 text-center">
                    ความพึงพอใจในการรับบริการครั้งนี้
                  </p>

                  <div className="grid grid-cols-5 gap-2 sm:gap-3 items-center">
                    {emotionLevels5.map((item) => {
                      const isSelected = counterOverallScore === item.score;
                      return (
                        <button
                          type="button"
                          key={item.score}
                          onClick={() => setCounterOverallScore(item.score)}
                          className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 border transform ${
                            isSelected
                              ? 'bg-sky-200 scale-105 shadow-md border-2 border-sky-600 ring-2 ring-sky-300'
                              : 'bg-white hover:bg-sky-100/70 opacity-80 hover:opacity-100 border-sky-100 hover:scale-105'
                          }`}
                        >
                          <span className={`${item.sizeClass} mb-1 drop-shadow-xs`}>
                            {item.emoji}
                          </span>
                          <span
                            className={`text-[9px] sm:text-xs font-bold text-center leading-tight whitespace-pre-line break-words w-full ${
                              isSelected ? 'text-sky-950 font-extrabold' : 'text-sky-800'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 📌 กรณีเลือก "อื่นๆ": แสดงหัวข้อประเมินปกติ พร้อมไอคอน 5 ระดับ[cite: 4] */
                visibleCriteriaList.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">
                    ไม่มีหัวข้อการประเมินในขณะนี้
                  </p>
                ) : (
                  visibleCriteriaList.map((crit, index) => (
                    <div
                      key={crit.id}
                      className="bg-sky-50/70 border border-sky-100 p-2.5 sm:p-3 rounded-2xl shadow-2xs"
                    >
                      <p className="font-bold text-sky-900 mb-2 text-center text-xs sm:text-sm md:text-base">
                        {index + 1}. {crit.title}
                      </p>

                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
                        {emotionLevels5.map((item) => {
                          const isSelected = scores[crit.id] === item.score;
                          return (
                            <button
                              type="button"
                              key={item.score}
                              onClick={() => setScores({ ...scores, [crit.id]: item.score })}
                              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl cursor-pointer transition-all duration-200 border transform ${
                                isSelected
                                  ? 'bg-sky-200 scale-105 shadow-md border-2 border-sky-600 ring-2 ring-sky-300'
                                  : 'bg-white hover:bg-sky-100/70 opacity-75 hover:opacity-100 border-sky-100 hover:scale-105'
                              }`}
                            >
                              <span className={`${item.sizeClass} mb-1 drop-shadow-xs`}>
                                {item.emoji}
                              </span>
                              <span
                                className={`text-[8px] sm:text-[11px] font-bold text-center leading-tight whitespace-pre-line break-words w-full ${
                                  isSelected ? 'text-sky-950 font-extrabold' : 'text-sky-800'
                                }`}
                              >
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )
              )}

              <div>
                <input
                  type="text"
                  placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-sky-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm text-sky-900 placeholder-sky-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 text-white py-3 sm:py-4 rounded-2xl font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-200 text-base sm:text-lg flex-shrink-0"
            >
              ยืนยันการประเมิน
            </button>
          </form>
        </div>
      )}

      {/* 🎉 5. หน้าจอขอบคุณ[cite: 4] */}
      {step === 'success' && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-sky-100 max-w-md w-full text-center space-y-4">
          <div className="text-6xl sm:text-7xl animate-bounce">💧</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-900">ขอบคุณสำหรับการประเมินครับ!</h2>
          <p className="text-sm sm:text-base text-sky-600/70">ระบบกำลังพากลับสู่หน้าประเมิน...</p>
        </div>
      )}
    </div>
  );
}
