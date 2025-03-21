import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Volume2, Book, Bookmark, Share2, RotateCcw, Info, ArrowLeft, Clock, ChevronRight, MapPin, X, Check, AlertTriangle } from 'lucide-react';

// تكوين التطبيق الرئيسي
const APP_CONFIG = {
  version: '1.2.0',
  name: 'تطبيق القرآن الكريم التعليمي',
  developer: 'عبدالرحمن عوض صالح الرشيدي للبرمجة وتطوير',
  quranAPI: 'https://api.alquran.cloud/v1/',
  tafsirAPI: 'https://api.quran.com/api/v4/',
  prayerAPI: 'https://api.aladhan.com/v1/',
  audioBaseURL: 'https://cdn.islamic.network/quran/audio/128/',
  copyright: {
    year: new Date().getFullYear(),
    owner: "عبدالرحمن عوض صالح الرشيدي للبرمجة وتطوير",
    phone: "+966 599900121",
    email: "Tiger3Saudi@gmail.com",
    location: "المملكة العربية السعودية، الرياض",
    rights: "جميع الحقوق محفوظة"
  }
};

// بيانات القراء
const RECITERS = [
  { id: 'ar.alafasy', name: 'مشاري راشد العفاسي', language: 'ar' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد', language: 'ar' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس', language: 'ar' },
  { id: 'ar.hanirifai', name: 'هاني الرفاعي', language: 'ar' },
  { id: 'ar.husary', name: 'محمود خليل الحصري', language: 'ar' },
  { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي', language: 'ar' },
  { id: 'ar.minshawi', name: 'محمد صديق المنشاوي', language: 'ar' },
  { id: 'ar.muhammadayyoub', name: 'محمد أيوب', language: 'ar' },
];

// بيانات اللغات
const LANGUAGES = [
  { code: 'ar', name: 'العربية', direction: 'rtl' },
  { code: 'en', name: 'English', direction: 'ltr' },
  { code: 'fr', name: 'Français', direction: 'ltr' },
  { code: 'ur', name: 'اردو', direction: 'rtl' },
  { code: 'id', name: 'Bahasa Indonesia', direction: 'ltr' },
];

// مكوّن الإشعارات
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center gap-2 ${
      type === 'success' ? 'bg-emerald-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-amber-600 text-white'
    }`}>
      {type === 'success' ? <Check className="w-5 h-5" /> :
       type === 'error' ? <X className="w-5 h-5" /> :
       <AlertTriangle className="w-5 h-5" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// مكون تحميل البيانات
const LoadingSpinner = ({ text = 'جاري التحميل...' }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
    <div className="text-emerald-700 dark:text-emerald-400 font-bold">{text}</div>
  </div>
);

// مكون مواقيت الصلاة
const PrayerTimes = () => {
  const [prayerTimes, setPrayerTimes] = useState({
    fajr: '--:--',
    dhuhr: '--:--',
    asr: '--:--',
    maghrib: '--:--',
    isha: '--:--',
    nextPrayer: null,
    countdown: '--:--'
  });
  
  const [location, setLocation] = useState({
    latitude: 24.7136,
    longitude: 46.6753,
    cityName: 'جاري تحديد الموقع...',
    countryCode: 'SA'
  });
  
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const countdownIntervalRef = useRef(null);
  
  useEffect(() => {
    // الحصول على الموقع الجغرافي للمستخدم
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation(prev => ({ ...prev, latitude: lat, longitude: lng }));
          fetchLocationName(lat, lng);
          calculateQiblaDirection(lat, lng);
          fetchPrayerTimes(lat, lng);
        },
        (error) => {
          console.error("خطأ في الحصول على الموقع:", error);
          // استخدام الموقع الافتراضي (الرياض)
          setError("تعذر الحصول على موقعك الحالي. تم استخدام الموقع الافتراضي (الرياض).");
          fetchPrayerTimes(location.latitude, location.longitude);
          calculateQiblaDirection(location.latitude, location.longitude);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError("المتصفح لا يدعم تحديد الموقع. تم استخدام الموقع الافتراضي (الرياض).");
      fetchPrayerTimes(location.latitude, location.longitude);
      calculateQiblaDirection(location.latitude, location.longitude);
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);
  
  // استرجاع اسم المدينة من الإحداثيات
  const fetchLocationName = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
      
      if (!response.ok) {
        throw new Error(`فشل الاستعلام: ${response.status}`);
      }
      
      const data = await response.json();
      
      // محاولة الحصول على اسم المدينة أو البلدة أو القرية أو المحافظة
      const city = data.address.city || data.address.town || data.address.village || data.address.state || data.address.county;
      const country_code = data.address.country_code;
      
      if (city) {
        setLocation(prev => ({ ...prev, cityName: city, countryCode: country_code }));
      } else {
        setLocation(prev => ({ ...prev, cityName: data.display_name.split(',')[0] }));
      }
    } catch (error) {
      console.error("خطأ في جلب اسم الموقع:", error);
      setError("تعذر الحصول على اسم موقعك الحالي.");
    }
  };
  
  // حساب اتجاه القبلة باستخدام صيغة الاتجاه العظمى
  const calculateQiblaDirection = (lat, lng) => {
    try {
      // إحداثيات الكعبة المشرفة (مكة المكرمة)
      const kaabaLat = 21.4225; // خط عرض الكعبة (بالدرجات)
      const kaabaLng = 39.8262; // خط طول الكعبة (بالدرجات)
      
      // تحويل الإحداثيات من درجات إلى راديان
      const latRad = lat * (Math.PI / 180);
      const lngRad = lng * (Math.PI / 180);
      const kaabaLatRad = kaabaLat * (Math.PI / 180);
      const kaabaLngRad = kaabaLng * (Math.PI / 180);
      
      // حساب اتجاه القبلة باستخدام صيغة الاتجاه العظمى (Great Circle Formula)
      const y = Math.sin(kaabaLngRad - lngRad);
      const x = (Math.cos(latRad) * Math.tan(kaabaLatRad)) - 
                (Math.sin(latRad) * Math.cos(kaabaLngRad - lngRad));
      
      // حساب الاتجاه بالراديان ثم تحويله إلى درجات
      let qiblaAngle = Math.atan2(y, x) * (180 / Math.PI);
      
      // تعديل القيمة إلى النطاق 0-360 درجة
      qiblaAngle = (qiblaAngle + 360) % 360;
      
      setQiblaDirection(qiblaAngle);
    } catch (error) {
      console.error("خطأ في حساب اتجاه القبلة:", error);
      setError("تعذر حساب اتجاه القبلة بدقة.");
      // استخدام قيمة افتراضية لاتجاه القبلة في الرياض
      setQiblaDirection(245.1);
    }
  };
  
  // جلب مواقيت الصلاة من API
  const fetchPrayerTimes = async (lat, lng) => {
    setIsLoading(true);
    try {
      const today = new Date();
      const formattedDate = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      const url = `${APP_CONFIG.prayerAPI}timings/${formattedDate}?latitude=${lat}&longitude=${lng}&method=4`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`فشل الاستعلام: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.timings) {
        const timings = data.data.timings;
        
        // تخزين أوقات الصلوات
        setPrayerTimes(prev => ({
          ...prev,
          fajr: timings.Fajr,
          dhuhr: timings.Dhuhr,
          asr: timings.Asr,
          maghrib: timings.Maghrib,
          isha: timings.Isha
        }));
        
        // حساب الصلاة التالية والعد التنازلي
        calculateNextPrayer(timings);
        
        // تحديث العد التنازلي كل دقيقة
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        
        countdownIntervalRef.current = setInterval(() => {
          updateCountdown(timings);
        }, 60000);
      } else {
        throw new Error("بيانات غير صالحة من API");
      }
    } catch (error) {
      console.error("خطأ في جلب مواقيت الصلاة:", error);
      setError("تعذر الحصول على مواقيت الصلاة. يرجى التحقق من اتصالك بالإنترنت.");
      
      // استخدام بيانات افتراضية
      setPrayerTimes({
        fajr: '04:30',
        dhuhr: '12:10',
        asr: '15:45',
        maghrib: '19:20',
        isha: '20:50',
        nextPrayer: 'asr',
        countdown: '--:--'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // تحديد الصلاة التالية وحساب العد التنازلي
  const calculateNextPrayer = (timings) => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute; // الوقت الحالي بالدقائق
      
      const prayers = [
        { name: 'fajr', arabicName: 'الفجر', time: timings.Fajr },
        { name: 'dhuhr', arabicName: 'الظهر', time: timings.Dhuhr },
        { name: 'asr', arabicName: 'العصر', time: timings.Asr },
        { name: 'maghrib', arabicName: 'المغرب', time: timings.Maghrib },
        { name: 'isha', arabicName: 'العشاء', time: timings.Isha }
      ];
      
      // تحويل أوقات الصلاة إلى دقائق
      const prayerMinutes = prayers.map(prayer => {
        const [hour, minute] = prayer.time.split(':');
        return {
          name: prayer.name,
          arabicName: prayer.arabicName,
          minutes: parseInt(hour) * 60 + parseInt(minute)
        };
      });
      
      // ترتيب الصلوات حسب الوقت
      prayerMinutes.sort((a, b) => a.minutes - b.minutes);
      
      // تحديد الصلاة التالية
      let nextPrayer = null;
      for (let prayer of prayerMinutes) {
        if (prayer.minutes > currentTime) {
          nextPrayer = prayer;
          break;
        }
      }
      
      // إذا تجاوزنا آخر صلاة في اليوم، فالصلاة التالية هي الفجر غدًا
      if (!nextPrayer) {
        nextPrayer = prayerMinutes[0]; // الفجر
        // إضافة 24 ساعة للوقت
        nextPrayer.minutes += 24 * 60;
      }
      
      // حساب الوقت المتبقي
      const remainingMinutes = nextPrayer.minutes - currentTime;
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      
      setPrayerTimes(prev => ({
        ...prev,
        nextPrayer: nextPrayer.name,
        nextPrayerArabic: nextPrayer.arabicName,
        countdown: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }));
    } catch (error) {
      console.error("خطأ في حساب الصلاة التالية:", error);
      setError("تعذر حساب وقت الصلاة التالية.");
    }
  };
  
  // تحديث العد التنازلي
  const updateCountdown = (timings) => {
    calculateNextPrayer(timings);
  };
  
  if (isLoading) {
    return <LoadingSpinner text="جاري تحميل مواقيت الصلاة..." />;
  }
  
  return (
    <div className="rounded-lg p-4 mb-6 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">مواعيد الصلاة</h2>
        <div className="flex items-center">
          <div className="bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm ml-2">
            <Clock className="w-4 h-4 inline ml-1" />
            <span>{prayerTimes.countdown}</span> لصلاة {prayerTimes.nextPrayerArabic}
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-between">
        <div className="w-full md:w-8/12">
          <div className="flex flex-wrap justify-between">
            <div className={`rounded-lg px-3 py-2 text-center mb-2 w-1/5 ${prayerTimes.nextPrayer === 'fajr' ? 'bg-amber-500 text-emerald-900' : 'bg-white bg-opacity-10'}`}>
              <div className="text-xs md:text-sm">الفجر</div>
              <div className="text-sm md:text-base">{prayerTimes.fajr}</div>
            </div>
            <div className={`rounded-lg px-3 py-2 text-center mb-2 w-1/5 ${prayerTimes.nextPrayer === 'dhuhr' ? 'bg-amber-500 text-emerald-900' : 'bg-white bg-opacity-10'}`}>
              <div className="text-xs md:text-sm">الظهر</div>
              <div className="text-sm md:text-base">{prayerTimes.dhuhr}</div>
            </div>
            <div className={`rounded-lg px-3 py-2 text-center mb-2 w-1/5 ${prayerTimes.nextPrayer === 'asr' ? 'bg-amber-500 text-emerald-900' : 'bg-white bg-opacity-10'}`}>
              <div className="text-xs md:text-sm">العصر</div>
              <div className="text-sm md:text-base">{prayerTimes.asr}</div>
            </div>
            <div className={`rounded-lg px-3 py-2 text-center mb-2 w-1/5 ${prayerTimes.nextPrayer === 'maghrib' ? 'bg-amber-500 text-emerald-900' : 'bg-white bg-opacity-10'}`}>
              <div className="text-xs md:text-sm">المغرب</div>
              <div className="text-sm md:text-base">{prayerTimes.maghrib}</div>
            </div>
            <div className={`rounded-lg px-3 py-2 text-center mb-2 w-1/5 ${prayerTimes.nextPrayer === 'isha' ? 'bg-amber-500 text-emerald-900' : 'bg-white bg-opacity-10'}`}>
              <div className="text-xs md:text-sm">العشاء</div>
              <div className="text-sm md:text-base">{prayerTimes.isha}</div>
            </div>
          </div>
          <div className="mt-2 text-center text-sm text-white text-opacity-80">
            <MapPin className="w-4 h-4 inline ml-1" />
            {location.cityName}
          </div>
        </div>
        
        <div className="w-full md:w-4/12 flex justify-center">
          <div className="text-center">
            <h2 className="text-lg font-bold mb-2">اتجاه القبلة</h2>
            <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-emerald-700 to-emerald-900 border-4 border-amber-500">
              <div 
                className="absolute w-2 h-12 bg-amber-500 top-2 left-1/2 origin-bottom" 
                style={{ transform: `translateX(-50%) rotate(${qiblaDirection}deg)` }}
              ></div>
              <div className="absolute w-4 h-4 bg-amber-500 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            <div className="mt-1 text-sm">{Math.round(qiblaDirection)}° من الشمال</div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 text-amber-200 text-sm text-center">
          <AlertTriangle className="w-4 h-4 inline ml-1" />
          {error}
        </div>
      )}
    </div>
  );
};

// قائمة السور الاحتياطية
const FALLBACK_SURAHS = [
  {number: 1, name: "الفاتحة", englishName: "Al-Fatiha", numberOfAyahs: 7, revelationType: "Meccan"},
  {number: 2, name: "البقرة", englishName: "Al-Baqara", numberOfAyahs: 286, revelationType: "Medinan"},
  {number: 3, name: "آل عمران", englishName: "Aal-Imran", numberOfAyahs: 200, revelationType: "Medinan"},
  {number: 4, name: "النساء", englishName: "An-Nisa", numberOfAyahs: 176, revelationType: "Medinan"},
  {number: 5, name: "المائدة", englishName: "Al-Ma'ida", numberOfAyahs: 120, revelationType: "Medinan"},
  {number: 6, name: "الأنعام", englishName: "Al-An'am", numberOfAyahs: 165, revelationType: "Meccan"},
  {number: 7, name: "الأعراف", englishName: "Al-A'raf", numberOfAyahs: 206, revelationType: "Meccan"},
  {number: 8, name: "الأنفال", englishName: "Al-Anfal", numberOfAyahs: 75, revelationType: "Medinan"},
  {number: 9, name: "التوبة", englishName: "At-Tawba", numberOfAyahs: 129, revelationType: "Medinan"},
  {number: 10, name: "يونس", englishName: "Yunus", numberOfAyahs: 109, revelationType: "Meccan"},
  {number: 11, name: "هود", englishName: "Hud", numberOfAyahs: 123, revelationType: "Meccan"},
  {number: 12, name: "يوسف", englishName: "Yusuf", numberOfAyahs: 111, revelationType: "Meccan"},
  {number: 13, name: "الرعد", englishName: "Ar-Ra'd", numberOfAyahs: 43, revelationType: "Medinan"},
  {number: 14, name: "إبراهيم", englishName: "Ibrahim", numberOfAyahs: 52, revelationType: "Meccan"},
  {number: 15, name: "الحجر", englishName: "Al-Hijr", numberOfAyahs: 99, revelationType: "Meccan"},
  {number: 16, name: "النحل", englishName: "An-Nahl", numberOfAyahs: 128, revelationType: "Meccan"},
  {number: 17, name: "الإسراء", englishName: "Al-Isra", numberOfAyahs: 111, revelationType: "Meccan"},
  {number: 18, name: "الكهف", englishName: "Al-Kahf", numberOfAyahs: 110, revelationType: "Meccan"},
  {number: 19, name: "مريم", englishName: "Maryam", numberOfAyahs: 98, revelationType: "Meccan"},
  {number: 20, name: "طه", englishName: "Ta-Ha", numberOfAyahs: 135, revelationType: "Meccan"},
  {number: 21, name: "الأنبياء", englishName: "Al-Anbiya", numberOfAyahs: 112, revelationType: "Meccan"},
  {number: 22, name: "الحج", englishName: "Al-Hajj", numberOfAyahs: 78, revelationType: "Medinan"},
  {number: 23, name: "المؤمنون", englishName: "Al-Mu'minun", numberOfAyahs: 118, revelationType: "Meccan"},
  {number: 24, name: "النور", englishName: "An-Nur", numberOfAyahs: 64, revelationType: "Medinan"},
  {number: 25, name: "الفرقان", englishName: "Al-Furqan", numberOfAyahs: 77, revelationType: "Meccan"},
  {number: 26, name: "الشعراء", englishName: "Ash-Shu'ara", numberOfAyahs: 227, revelationType: "Meccan"},
  {number: 27, name: "النمل", englishName: "An-Naml", numberOfAyahs: 93, revelationType: "Meccan"},
  {number: 28, name: "القصص", englishName: "Al-Qasas", numberOfAyahs: 88, revelationType: "Meccan"},
  {number: 29, name: "العنكبوت", englishName: "Al-Ankabut", numberOfAyahs: 69, revelationType: "Meccan"},
  {number: 30, name: "الروم", englishName: "Ar-Rum", numberOfAyahs: 60, revelationType: "Meccan"},
  {number: 31, name: "لقمان", englishName: "Luqman", numberOfAyahs: 34, revelationType: "Meccan"},
  {number: 32, name: "السجدة", englishName: "As-Sajda", numberOfAyahs: 30, revelationType: "Meccan"},
  {number: 33, name: "الأحزاب", englishName: "Al-Ahzab", numberOfAyahs: 73, revelationType: "Medinan"},
  {number: 34, name: "سبأ", englishName: "Saba", numberOfAyahs: 54, revelationType: "Meccan"},
  {number: 35, name: "فاطر", englishName: "Fatir", numberOfAyahs: 45, revelationType: "Meccan"},
  {number: 36, name: "يس", englishName: "Ya-Sin", numberOfAyahs: 83, revelationType: "Meccan"},
  {number: 37, name: "الصافات", englishName: "As-Saffat", numberOfAyahs: 182, revelationType: "Meccan"},
  {number: 38, name: "ص", englishName: "Sad", numberOfAyahs: 88, revelationType: "Meccan"},
  {number: 39, name: "الزمر", englishName: "Az-Zumar", numberOfAyahs: 75, revelationType: "Meccan"},
  {number: 40, name: "غافر", englishName: "Ghafir", numberOfAyahs: 85, revelationType: "Meccan"},
  {number: 41, name: "فصلت", englishName: "Fussilat", numberOfAyahs: 54, revelationType: "Meccan"},
  {number: 42, name: "الشورى", englishName: "Ash-Shura", numberOfAyahs: 53, revelationType: "Meccan"},
  {number: 43, name: "الزخرف", englishName: "Az-Zukhruf", numberOfAyahs: 89, revelationType: "Meccan"},
  {number: 44, name: "الدخان", englishName: "Ad-Dukhan", numberOfAyahs: 59, revelationType: "Meccan"},
  {number: 45, name: "الجاثية", englishName: "Al-Jathiya", numberOfAyahs: 37, revelationType: "Meccan"},
  {number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", numberOfAyahs: 35, revelationType: "Meccan"},
  {number: 47, name: "محمد", englishName: "Muhammad", numberOfAyahs: 38, revelationType: "Medinan"},
  {number: 48, name: "الفتح", englishName: "Al-Fath", numberOfAyahs: 29, revelationType: "Medinan"},
  {number: 49, name: "الحجرات", englishName: "Al-Hujurat", numberOfAyahs: 18, revelationType: "Medinan"},
  {number: 50, name: "ق", englishName: "Qaf", numberOfAyahs: 45, revelationType: "Meccan"},
  {number: 51, name: "الذاريات", englishName: "Adh-Dhariyat", numberOfAyahs: 60, revelationType: "Meccan"},
  {number: 52, name: "الطور", englishName: "At-Tur", numberOfAyahs: 49, revelationType: "Meccan"},
  {number: 53, name: "النجم", englishName: "An-Najm", numberOfAyahs: 62, revelationType: "Meccan"},
  {number: 54, name: "القمر", englishName: "Al-Qamar", numberOfAyahs: 55, revelationType: "Meccan"},
  {number: 55, name: "الرحمن", englishName: "Ar-Rahman", numberOfAyahs: 78, revelationType: "Medinan"},
  {number: 56, name: "الواقعة", englishName: "Al-Waqi'a", numberOfAyahs: 96, revelationType: "Meccan"},
  {number: 57, name: "الحديد", englishName: "Al-Hadid", numberOfAyahs: 29, revelationType: "Medinan"},
  {number: 58, name: "المجادلة", englishName: "Al-Mujadila", numberOfAyahs: 22, revelationType: "Medinan"},
  {number: 59, name: "الحشر", englishName: "Al-Hashr", numberOfAyahs: 24, revelationType: "Medinan"},
  {number: 60, name: "الممتحنة", englishName: "Al-Mumtahina", numberOfAyahs: 13, revelationType: "Medinan"},
  {number: 61, name: "الصف", englishName: "As-Saf", numberOfAyahs: 14, revelationType: "Medinan"},
  {number: 62, name: "الجمعة", englishName: "Al-Jumu'a", numberOfAyahs: 11, revelationType: "Medinan"},
  {number: 63, name: "المنافقون", englishName: "Al-Munafiqun", numberOfAyahs: 11, revelationType: "Medinan"},
  {number: 64, name: "التغابن", englishName: "At-Taghabun", numberOfAyahs: 18, revelationType: "Medinan"},
  {number: 65, name: "الطلاق", englishName: "At-Talaq", numberOfAyahs: 12, revelationType: "Medinan"},
  {number: 66, name: "التحريم", englishName: "At-Tahrim", numberOfAyahs: 12, revelationType: "Medinan"},
  {number: 67, name: "الملك", englishName: "Al-Mulk", numberOfAyahs: 30, revelationType: "Meccan"},
  {number: 68, name: "القلم", englishName: "Al-Qalam", numberOfAyahs: 52, revelationType: "Meccan"},
  {number: 69, name: "الحاقة", englishName: "Al-Haaqqa", numberOfAyahs: 52, revelationType: "Meccan"},
  {number: 70, name: "المعارج", englishName: "Al-Ma'arij", numberOfAyahs: 44, revelationType: "Meccan"},
  {number: 71, name: "نوح", englishName: "Nuh", numberOfAyahs: 28, revelationType: "Meccan"},
  {number: 72, name: "الجن", englishName: "Al-Jinn", numberOfAyahs: 28, revelationType: "Meccan"},
  {number: 73, name: "المزمل", englishName: "Al-Muzzammil", numberOfAyahs: 20, revelationType: "Meccan"},
  {number: 74, name: "المدثر", englishName: "Al-Muddathir", numberOfAyahs: 56, revelationType: "Meccan"},
  {number: 75, name: "القيامة", englishName: "Al-Qiyama", numberOfAyahs: 40, revelationType: "Meccan"},
  {number: 76, name: "الإنسان", englishName: "Al-Insan", numberOfAyahs: 31, revelationType: "Medinan"},
  {number: 77, name: "المرسلات", englishName: "Al-Mursalat", numberOfAyahs: 50, revelationType: "Meccan"},
  {number: 78, name: "النبأ", englishName: "An-Naba", numberOfAyahs: 40, revelationType: "Meccan"},
  {number: 79, name: "النازعات", englishName: "An-Nazi'at", numberOfAyahs: 46, revelationType: "Meccan"},
  {number: 80, name: "عبس", englishName: "Abasa", numberOfAyahs: 42, revelationType: "Meccan"},
  {number: 81, name: "التكوير", englishName: "At-Takwir", numberOfAyahs: 29, revelationType: "Meccan"},
  {number: 82, name: "الإنفطار", englishName: "Al-Infitar", numberOfAyahs: 19, revelationType: "Meccan"},
  {number: 83, name: "المطففين", englishName: "Al-Mutaffifin", numberOfAyahs: 36, revelationType: "Meccan"},
  {number: 84, name: "الإنشقاق", englishName: "Al-Inshiqaq", numberOfAyahs: 25, revelationType: "Meccan"},
  {number: 85, name: "البروج", englishName: "Al-Buruj", numberOfAyahs: 22, revelationType: "Meccan"},
  {number: 86, name: "الطارق", englishName: "At-Tariq", numberOfAyahs: 17, revelationType: "Meccan"},
  {number: 87, name: "الأعلى", englishName: "Al-A'la", numberOfAyahs: 19, revelationType: "Meccan"},
  {number: 88, name: "الغاشية", englishName: "Al-Ghashiya", numberOfAyahs: 26, revelationType: "Meccan"},
  {number: 89, name: "الفجر", englishName: "Al-Fajr", numberOfAyahs: 30, revelationType: "Meccan"},
  {number: 90, name: "البلد", englishName: "Al-Balad", numberOfAyahs: 20, revelationType: "Meccan"},
  {number: 91, name: "الشمس", englishName: "Ash-Shams", numberOfAyahs: 15, revelationType: "Meccan"},
  {number: 92, name: "الليل", englishName: "Al-Layl", numberOfAyahs: 21, revelationType: "Meccan"},
  {number: 93, name: "الضحى", englishName: "Ad-Duhaa", numberOfAyahs: 11, revelationType: "Meccan"},
  {number: 94, name: "الشرح", englishName: "Ash-Sharh", numberOfAyahs: 8, revelationType: "Meccan"},
  {number: 95, name: "التين", englishName: "At-Tin", numberOfAyahs: 8, revelationType: "Meccan"},
  {number: 96, name: "العلق", englishName: "Al-Alaq", numberOfAyahs: 19, revelationType: "Meccan"},
  {number: 97, name: "القدر", englishName: "Al-Qadr", numberOfAyahs: 5, revelationType: "Meccan"},
  {number: 98, name: "البينة", englishName: "Al-Bayyina", numberOfAyahs: 8, revelationType: "Medinan"},
  {number: 99, name: "الزلزلة", englishName: "Az-Zalzala", numberOfAyahs: 8, revelationType: "Medinan"},
  {number: 100, name: "العاديات", englishName: "Al-Adiyat", numberOfAyahs: 11, revelationType: "Meccan"},
  {number: 101, name: "القارعة", englishName: "Al-Qari'a", numberOfAyahs: 11, revelationType: "Meccan"},
  {number: 102, name: "التكاثر", englishName: "At-Takathur", numberOfAyahs: 8, revelationType: "Meccan"},
  {number: 103, name: "العصر", englishName: "Al-Asr", numberOfAyahs: 3, revelationType: "Meccan"},
  {number: 104, name: "الهمزة", englishName: "Al-Humaza", numberOfAyahs: 9, revelationType: "Meccan"},
  {number: 105, name: "الفيل", englishName: "Al-Fil", numberOfAyahs: 5, revelationType: "Meccan"},
  {number: 106, name: "قريش", englishName: "Quraysh", numberOfAyahs: 4, revelationType: "Meccan"},
  {number: 107, name: "الماعون", englishName: "Al-Ma'un", numberOfAyahs: 7, revelationType: "Meccan"},
  {number: 108, name: "الكوثر", englishName: "Al-Kawthar", numberOfAyahs: 3, revelationType: "Meccan"},
  {number: 109, name: "الكافرون", englishName: "Al-Kafirun", numberOfAyahs: 6, revelationType: "Meccan"},
  {number: 110, name: "النصر", englishName: "An-Nasr", numberOfAyahs: 3, revelationType: "Medinan"},
  {number: 111, name: "المسد", englishName: "Al-Masad", numberOfAyahs: 5, revelationType: "Meccan"},
  {number: 112, name: "الإخلاص", englishName: "Al-Ikhlas", numberOfAyahs: 4, revelationType: "Meccan"},
  {number: 113, name: "الفلق", englishName: "Al-Falaq", numberOfAyahs: 5, revelationType: "Meccan"},
  {number: 114, name: "الناس", englishName: "An-Nas", numberOfAyahs: 6, revelationType: "Meccan"}
];

// مكون قائمة السور
const SurahList = ({ onSelectSurah }) => {
  const [surahs, setSurahs] = useState(FALLBACK_SURAHS); // استخدام القائمة الاحتياطية كقيمة مبدئية
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  
  useEffect(() => {
    fetchSurahList();
  }, []);
  
  const fetchSurahList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${APP_CONFIG.quranAPI}surah`);
      
      if (!response.ok) {
        throw new Error(`فشل الاستعلام: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        setSurahs(data.data);
        setUseFallback(false);
      } else {
        throw new Error("بيانات غير صالحة من API");
      }
    } catch (error) {
      console.error("خطأ في جلب قائمة السور:", error);
      // استخدام القائمة الاحتياطية في حالة فشل الاستعلام
      setSurahs(FALLBACK_SURAHS);
      setUseFallback(true);
      setError("تم استخدام قائمة السور المخزنة محلياً بسبب مشكلة في الاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };
  
  const filteredSurahs = surahs.filter(surah => 
    surah.name.includes(searchQuery) || 
    surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.number.toString().includes(searchQuery)
  );
  
  if (loading) {
    return <LoadingSpinner text="جاري تحميل قائمة السور..." />;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      {error && (
        <div className="mb-4 bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          <AlertTriangle className="w-4 h-4 inline ml-1" />
          {error}
          {useFallback && (
            <button 
              onClick={fetchSurahList}
              className="mr-2 underline text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              محاولة الاتصال مرة أخرى
            </button>
          )}
        </div>
      )}
    
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن سورة..."
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSurahs.length > 0 ? (
          filteredSurahs.map((surah) => (
            <div 
              key={surah.number}
              onClick={() => onSelectSurah(surah.number)}
              className="bg-emerald-50 dark:bg-emerald-900 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center ml-2">
                  {surah.number}
                </div>
                <div>
                  <div className="font-bold">{surah.name}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">{surah.englishName}</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">
                {surah.numberOfAyahs} آية
                <ChevronRight className="w-4 h-4 inline mr-1" />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center p-8 text-gray-500 dark:text-gray-400">
            لا توجد نتائج تطابق بحثك. حاول استخدام كلمات بحث أخرى.
          </div>
        )}
      </div>
    </div>
  );
};

// مكون البحث في القرآن
const QuranSearch = ({ onResults }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // البحث عن الآيات باستخدام API
      const response = await fetch(`${APP_CONFIG.tafsirAPI}search?q=${encodeURIComponent(query)}&language=ar&size=20`);
      
      if (!response.ok) {
        throw new Error(`فشل الاستعلام: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.search && data.search.results) {
        onResults(data.search.results);
      } else {
        onResults([]);
      }
    } catch (error) {
      console.error("خطأ في البحث:", error);
      setError("تعذر إجراء البحث. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 mb-6">
      <form onSubmit={handleSearch}>
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في القرآن الكريم..."
            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          <button
            type="submit"
            className={`${loading ? 'bg-gray-500' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-l-lg`}
            disabled={loading}
          >
            {loading ? 'جاري البحث...' : '🔍 بحث'}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="mt-3 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 inline ml-1" />
          {error}
        </div>
      )}
    </div>
  );
};

// نتائج البحث
const SearchResults = ({ results, onSelectAyah }) => {
  if (!results || results.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-4 mb-6 text-center">
        <div className="text-amber-700 dark:text-amber-300 font-bold mb-2">لم يتم العثور على نتائج</div>
        <div className="text-amber-800 dark:text-amber-200">
          حاول استخدام كلمات بحث أخرى أو تأكد من صحة ما تبحث عنه.
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
      <h3 className="text-xl font-bold mb-4 text-emerald-700 dark:text-emerald-400">نتائج البحث</h3>
      <div className="text-gray-600 dark:text-gray-400 mb-4">
        تم العثور على {results.length} نتيجة
      </div>
      
      <div className="space-y-4">
        {results.map((result, index) => (
          <div 
            key={index}
            className="p-3 border-r-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-lg cursor-pointer"
            onClick={() => onSelectAyah(result.verse_key)}
          >
            <div className="flex justify-between mb-2">
              <div className="font-bold text-emerald-700 dark:text-emerald-400">
                سورة {result.verse.translations[0]?.surah_name || result.verse_key.split(':')[0]} | الآية {result.verse_key.split(':')[1]}
              </div>
            </div>
            <div className="text-gray-800 dark:text-gray-200 mb-2" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {result.text}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              انقر لعرض الآية في سياقها
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// القسم الرئيسي
const MainSections = ({ onSectionSelect }) => {
  const sections = [
    { id: 'quran', name: 'القرآن الكريم', icon: '📖' },
    { id: 'memorization', name: 'حلقات التحفيظ', icon: '👥' },
    { id: 'learn-reading', name: 'تعلم القراءة', icon: '📚' },
    { id: 'virtual-classes', name: 'الفصول الافتراضية', icon: '🖥️' },
    { id: 'educational', name: 'المواد التعليمية', icon: '🎓' },
    { id: 'ask-scholars', name: 'تواصل مع العلماء', icon: '👨‍🏫' },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {sections.map(section => (
        <div
          key={section.id}
          onClick={() => onSectionSelect(section.id)}
          className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white rounded-lg p-6 text-center cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all"
        >
          <div className="text-3xl mb-3">{section.icon}</div>
          <h3 className="text-lg font-bold">{section.name}</h3>
        </div>
      ))}
    </div>
  );
};

// مكون القرآن الكريم (القسم الرئيسي)
const QuranSection = () => {
  const [view, setView] = useState('surah-list'); // surah-list, surah-view, search
  const [currentSurah, setCurrentSurah] = useState(1);
  const [currentAyah, setCurrentAyah] = useState(1);
  const [currentReciter, setCurrentReciter] = useState(RECITERS[0].id);
  const [searchResults, setSearchResults] = useState(null);
  const [toast, setToast] = useState(null);
  
  const handleSelectSurah = (surahNumber) => {
    setCurrentSurah(surahNumber);
    setCurrentAyah(1);
    setView('surah-view');
  };
  
  const handleSelectAyahFromSearch = (verseKey) => {
    const [surahNumber, ayahNumber] = verseKey.split(':');
    setCurrentSurah(parseInt(surahNumber));
    setCurrentAyah(parseInt(ayahNumber));
    setView('surah-view');
  };
  
  const handleBackToList = () => {
    setView('surah-list');
    setSearchResults(null);
  };
  
  const handleSearch = () => {
    setView('search');
  };
  
  const handleSearchResults = (results) => {
    setSearchResults(results);
  };
  
  const handleReciterChange = (reciterId) => {
    setCurrentReciter(reciterId);
    setToast({
      message: `تم تغيير القارئ إلى ${RECITERS.find(r => r.id === reciterId).name}`,
      type: 'success'
    });
  };
  
  const clearToast = () => {
    setToast(null);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {view !== 'surah-list' && (
          <button 
            onClick={handleBackToList}
            className="flex items-center text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4 ml-1" />
            {view === 'search' ? 'العودة للقائمة الرئيسية' : 'العودة لقائمة السور'}
          </button>
        )}
        
        {view === 'surah-view' && (
          <div className="flex items-center">
            <label htmlFor="reciter" className="text-sm font-medium ml-2">القارئ:</label>
            <select
              id="reciter"
              value={currentReciter}
              onChange={(e) => handleReciterChange(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm py-1"
            >
              {RECITERS.map(reciter => (
                <option key={reciter.id} value={reciter.id}>
                  {reciter.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {view === 'surah-list' && (
          <button 
            onClick={handleSearch}
            className="flex items-center text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span className="ml-1">🔍</span>
            بحث في القرآن
          </button>
        )}
      </div>
      
      {view === 'search' && (
        <>
          <QuranSearch onResults={handleSearchResults} />
          {searchResults && <SearchResults results={searchResults} onSelectAyah={handleSelectAyahFromSearch} />}
        </>
      )}
      
      {view === 'surah-list' && <SurahList onSelectSurah={handleSelectSurah} />}
      
      {view === 'surah-view' && (
        <SurahView 
          surahNumber={currentSurah} 
          initialAyah={currentAyah}
          reciterId={currentReciter} 
        />
      )}
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
    </div>
  );
};

// النص القرآني الافتراضي للسور الأكثر شيوعاً
const FALLBACK_AYAHS = {
  // سورة الفاتحة
  1: [
    { number: 1, numberInSurah: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
    { number: 2, numberInSurah: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ" },
    { number: 3, numberInSurah: 3, text: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
    { number: 4, numberInSurah: 4, text: "مَٰلِكِ يَوْمِ ٱلدِّينِ" },
    { number: 5, numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { number: 6, numberInSurah: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ" },
    { number: 7, numberInSurah: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ" }
  ],
  // سورة الإخلاص
  112: [
    { number: 6222, numberInSurah: 1, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
    { number: 6223, numberInSurah: 2, text: "ٱللَّهُ ٱلصَّمَدُ" },
    { number: 6224, numberInSurah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    { number: 6225, numberInSurah: 4, text: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ" }
  ],
  // سورة الفلق
  113: [
    { number: 6226, numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ" },
    { number: 6227, numberInSurah: 2, text: "مِن شَرِّ مَا خَلَقَ" },
    { number: 6228, numberInSurah: 3, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
    { number: 6229, numberInSurah: 4, text: "وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ" },
    { number: 6230, numberInSurah: 5, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ" }
  ],
  // سورة الناس
  114: [
    { number: 6231, numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ" },
    { number: 6232, numberInSurah: 2, text: "مَلِكِ ٱلنَّاسِ" },
    { number: 6233, numberInSurah: 3, text: "إِلَٰهِ ٱلنَّاسِ" },
    { number: 6234, numberInSurah: 4, text: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ" },
    { number: 6235, numberInSurah: 5, text: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ" },
    { number: 6236, numberInSurah: 6, text: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ" }
  ]
};

// التفاسير الافتراضية
const FALLBACK_TAFSIRS = {
  "1:1": "بدأت السورة بالبسملة، ومعناها: أبدأ بتسمية الله مستعينًا به، وهو الذي يستحق العبادة، وهو الرحمن الرحيم.",
  "1:2": "الحمد لله: هو الثناء على الله بصفاته التي كلها صفات كمال، وبنعمه الظاهرة والباطنة الدينية والدنيوية. والرب: هو المربي جميع عباده بالنعم الجسام. ولكن تربيته للمؤمنين خاصة: بتربية قلوبهم بالإيمان والعلم النافع. والعالمين: جمع عالَم، وهو كل موجود سوى الله.",
  "1:3": "الرحمن: ذو الرحمة الواسعة العامة لجميع الخلائق. الرحيم: المنعم بإيصال الرحمة الخاصة للمؤمنين. وكلتاهما صفة لله تعالى، مشتقة من الرحمة.",
  "1:4": "هو المالك المتصرف في يوم الجزاء. وفيه إثبات البعث والجزاء.",
  "1:5": "أي: نخصك -يا الله- وحدك، بالعبادة والاستعانة. وتقديم العبادة على الاستعانة من باب تقديم الغاية على الوسيلة؛ لأن العبادة هي الغاية التي خلق الله الخلق من أجلها.",
  "1:6": "أي: دلنا، وأرشدنا، ووفقنا إلى الصراط المستقيم.",
  "1:7": "المراد بالصراط المستقيم: طريق الذين أنعمت عليهم من النبيين والصديقين والشهداء والصالحين، غير طريق المغضوب عليهم -وهم اليهود ومن سلك طريقهم-، ولا طريق الضالين -وهم النصارى ومن سلك طريقهم-.",
  "112:1": "قُلْ -يا محمد-: هو الله أحد، المتفرد بالكمال، المنزَّه عن النقص.",
  "112:2": "أي: المقصود وحده في قضاء الحوائج.",
  "112:3": "لم يلد أحدًا، ولم يولد، بل هو الأول الذي ليس قبله شيء.",
  "112:4": "ولم يكن له نظير ولا مكافئ ولا مماثل.",
  "113:1": "قُلْ -أيها الرسول-: ألتجئ وأعتصم برب الفلق (الصبح).",
  "113:2": "من شر جميع المخلوقات.",
  "113:3": "ومن شرِّ ليل شديد الظلام إذا أقبل بظلامه.",
  "113:4": "ومن شرِّ النساء اللاتي يَنْفُثْنَ في العُقَد (أي: الرقى يَعْقِدْنَ عليها خيوطًا ويَنْفُثْنَ عليها سحرًا).",
  "113:5": "ومن شرِّ كل ذي حسد إذا أظهر حسده، وحاول الإضرار.",
  "114:1": "قُلْ -أيها الرسول-: أعتصم بالله وألتجئ إليه من الشرور، وهو رب الناس وخالقهم ومدبر أمورهم.",
  "114:2": "هو سبحانه ملك الناس ومالكهم.",
  "114:3": "هو معبودهم الحق.",
  "114:4": "استعيذ به مِن شرِّ الشيطان، الذي يُوَسْوِس للإنسان ثم يتأخر ويختفي إذا ذُكِر الله.",
  "114:5": "الذي يوسوس للإنسان، ويلقي الشبهات والأفكار السيئة في باطن صدره.",
  "114:6": "سواء كان الموسوس من الجن أو من شياطين الإنس."
};

// مكون عرض السورة
const SurahView = ({ surahNumber = 1, initialAyah = 1, reciterId = 'ar.alafasy' }) => {
  const [surah, setSurah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAyah, setCurrentAyah] = useState(initialAyah);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirText, setTafsirText] = useState('');
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bookmark, setBookmark] = useState(null);
  const [toast, setToast] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const audioRef = useRef(null);
  const ayahRefs = useRef({});
  
  // جلب بيانات السورة عند تغيير رقم السورة
  useEffect(() => {
    fetchSurah();
    // التحقق من وجود علامات مرجعية محفوظة
    checkBookmarks();
  }, [surahNumber]);
  
  // التمرير إلى الآية المحددة
  useEffect(() => {
    if (surah && !loading && currentAyah) {
      const ayahElement = ayahRefs.current[currentAyah];
      if (ayahElement) {
        setTimeout(() => {
          ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  }, [surah, loading, currentAyah]);
  
  // جلب البيانات من API أو استخدام البيانات الاحتياطية
  const fetchSurah = async () => {
    setLoading(true);
    setError(null);
    
    // التحقق من توفر البيانات الاحتياطية لهذه السورة
    const hasFallbackData = !!FALLBACK_AYAHS[surahNumber];
    
    try {
      const response = await fetch(`${APP_CONFIG.quranAPI}surah/${surahNumber}`);
      
      if (!response.ok) {
        throw new Error(`فشل الاستعلام: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        setSurah(data.data);
        setUseFallback(false);
        
        // إذا كان هناك آية محددة، قم بجلب تفسيرها تلقائيًا
        if (initialAyah > 1) {
          setCurrentAyah(initialAyah);
          fetchTafsir(initialAyah);
        }
      } else {
        throw new Error("بيانات غير صالحة من API");
      }
    } catch (error) {
      console.error("خطأ في جلب بيانات السورة:", error);
      
      // استخدام البيانات الاحتياطية إذا كانت متوفرة
      if (hasFallbackData) {
        // الحصول على بيانات السورة من FALLBACK_SURAHS
        const fallbackSurah = FALLBACK_SURAHS.find(s => s.number === surahNumber);
        
        if (fallbackSurah) {
          setSurah({
            ...fallbackSurah,
            ayahs: FALLBACK_AYAHS[surahNumber]
          });
          setUseFallback(true);
          
          // إظهار تنبيه باستخدام البيانات الاحتياطية
          setError("تم استخدام البيانات المحلية للسورة بسبب مشكلة في الاتصال بالإنترنت.");
          
          if (initialAyah > 1) {
            setCurrentAyah(initialAyah);
          }
        } else {
          setError("تعذر تحميل السورة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.");
        }
      } else {
        setError("تعذر تحميل السورة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  // التحقق من وجود علامات مرجعية
  const checkBookmarks = () => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('quran-bookmarks')) || {};
      if (bookmarks[surahNumber]) {
        setBookmark(bookmarks[surahNumber]);
      } else {
        setBookmark(null);
      }
    } catch (error) {
      console.error("خطأ في استرجاع العلامات المرجعية:", error);
    }
  };
  
  // حفظ علامة مرجعية
  const saveBookmark = (ayahNumber) => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('quran-bookmarks')) || {};
      bookmarks[surahNumber] = ayahNumber;
      localStorage.setItem('quran-bookmarks', JSON.stringify(bookmarks));
      setBookmark(ayahNumber);
      
      // إظهار رسالة تأكيد
      setToast({
        message: `تم حفظ العلامة المرجعية للآية ${ayahNumber} من سورة ${surah.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error("خطأ في حفظ العلامة المرجعية:", error);
      setToast({
        message: "تعذر حفظ العلامة المرجعية",
        type: 'error'
      });
    }
  };
  
  // معالجة النقر على الآية
  const handleAyahClick = (ayahNumber) => {
    setCurrentAyah(ayahNumber);
    fetchTafsir(ayahNumber);
  };
  
  // استرجاع تفسير الآية
  const fetchTafsir = async (ayahNumber) => {
    if (!showTafsir) {
      setShowTafsir(true);
    }
    
    setTafsirLoading(true);
    setTafsirText('');
    setTafsirError(null);
    
    // التحقق إذا كان هناك تفسير محلي متاح
    const fallbackTafsirKey = `${surahNumber}:${ayahNumber}`;
    const hasFallbackTafsir = !!FALLBACK_TAFSIRS[fallbackTafsirKey];
    
    try {
      // استخدام API التفسير
      const response = await fetch(`${APP_CONFIG.tafsirAPI}tafsirs/ar.muyassar/by_ayah/${surahNumber}:${ayahNumber}`);
      
      if (!response.ok) {
        throw new Error(`فشل الاستعلام: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.tafsirs && data.tafsirs.length > 0) {
        setTafsirText(data.tafsirs[0].text);
      } else if (hasFallbackTafsir) {
        // استخدام التفسير الاحتياطي إذا كان API لا يعيد بيانات
        setTafsirText(FALLBACK_TAFSIRS[fallbackTafsirKey]);
      } else {
        setTafsirText("لا يوجد تفسير متاح لهذه الآية.");
      }
    } catch (error) {
      console.error("خطأ في جلب التفسير:", error);
      
      if (hasFallbackTafsir) {
        // استخدام التفسير الاحتياطي في حالة الخطأ
        setTafsirText(FALLBACK_TAFSIRS[fallbackTafsirKey]);
      } else {
        setTafsirError("تعذر جلب التفسير. تم استخدام التفسير المحلي إذا كان متاحًا.");
      }
    } finally {
      setTafsirLoading(false);
    }
  };
  
  // تشغيل الصوت للآية المحددة
  const playAudio = (ayahNumber) => {
    if (audioRef.current) {
      // تنسيق رقم السورة والآية بالطريقة المطلوبة للـ API
      const formattedSurah = surahNumber.toString().padStart(3, '0');
      const formattedAyah = ayahNumber.toString().padStart(3, '0');
      
      // تكوين مسار الصوت حسب بنية API القرآن
      const audioPath = `${reciterId}/${formattedSurah}${formattedAyah}.mp3`;
      
      // تعيين مصدر الصوت
      audioRef.current.src = `${APP_CONFIG.audioBaseURL}${audioPath}`;
      
      // تشغيل الصوت
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setCurrentAyah(ayahNumber);
        })
        .catch(error => {
          console.error("خطأ في تشغيل الصوت:", error);
          setToast({
            message: "تعذر تشغيل الصوت. يرجى التحقق من اتصالك بالإنترنت.",
            type: 'error'
          });
        });
    }
  };
  
  // تشغيل كامل السورة
  const playFullSurah = () => {
    if (surah && surah.ayahs && surah.ayahs.length > 0) {
      playAudio(1);
    }
  };
  
  // إيقاف الصوت
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };
  
  // مشاركة الآية
  const shareAyah = (ayahNumber) => {
    if (surah && surah.ayahs) {
      const ayah = surah.ayahs.find(a => a.numberInSurah === ayahNumber);
      if (ayah) {
        const shareText = `${ayah.text}\n\n[سورة ${surah.name} - الآية ${ayahNumber}]\nتطبيق القرآن الكريم التعليمي`;
        
        if (navigator.share) {
          navigator.share({
            title: `الآية ${ayahNumber} من سورة ${surah.name}`,
            text: shareText
          }).catch(error => {
            console.error("خطأ في المشاركة:", error);
            // نسخ النص إلى الحافظة كبديل
            copyToClipboard(shareText);
          });
        } else {
          // نسخ النص إلى الحافظة للمتصفحات التي لا تدعم واجهة المشاركة
          copyToClipboard(shareText);
        }
      }
    }
  };
  
  // نسخ النص إلى الحافظة
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setToast({
          message: "تم نسخ الآية إلى الحافظة",
          type: 'success'
        });
      })
      .catch(error => {
        console.error("خطأ في نسخ النص:", error);
        setToast({
          message: "تعذر نسخ النص",
          type: 'error'
        });
      });
  };
  
  const clearToast = () => {
    setToast(null);
  };
  
  if (loading) {
    return <LoadingSpinner text="جاري تحميل السورة..." />;
  }
  
  if (error && !surah) {
    return (
      <div className="bg-red-100 dark:bg-red-900 p-6 rounded-lg text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-3" />
        <div className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">حدث خطأ!</div>
        <div className="text-red-700 dark:text-red-300 mb-4">{error}</div>
        <button 
          onClick={fetchSurah}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
  
  if (!surah) {
    return (
      <div className="text-center p-6 bg-red-100 dark:bg-red-900 rounded-lg">
        <div className="text-red-600 dark:text-red-300 font-bold">لا يمكن تحميل السورة</div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      {error && (
        <div className="mb-4 bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          <AlertTriangle className="w-4 h-4 inline ml-1" />
          {error}
          {useFallback && (
            <button 
              onClick={fetchSurah}
              className="mr-2 underline text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              محاولة الاتصال مرة أخرى
            </button>
          )}
        </div>
      )}
    
      <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
          سورة {surah.name} ({surah.englishName})
        </h2>
        <div className="text-center text-gray-600 dark:text-gray-400">
          {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} - {surah.numberOfAyahs} آية
        </div>
      </div>
      
      {/* تشغيل الآيات */}
      <audio 
        ref={audioRef} 
        onEnded={() => {
          if (currentAyah < surah.numberOfAyahs) {
            playAudio(currentAyah + 1);
          } else {
            setIsPlaying(false);
            setToast({
              message: "انتهى تشغيل السورة",
              type: 'success'
            });
          }
        }} 
      />
      
      {/* أزرار التحكم */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button 
          onClick={() => isPlaying ? stopAudio() : playFullSurah()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          {isPlaying ? <RotateCcw className="w-5 h-5 ml-2" /> : <Volume2 className="w-5 h-5 ml-2" />}
          {isPlaying ? 'إيقاف الاستماع' : 'الاستماع للسورة'}
        </button>
        
        <button 
          onClick={() => setShowTafsir(!showTafsir)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Book className="w-5 h-5 ml-2" />
          {showTafsir ? 'إخفاء التفسير' : 'عرض التفسير'}
        </button>
        
        {bookmark && (
          <button 
            onClick={() => {
              setCurrentAyah(bookmark);
              const element = ayahRefs.current[bookmark];
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Bookmark className="w-5 h-5 ml-2" />
            استئناف القراءة (الآية {bookmark})
          </button>
        )}
      </div>
      
      {/* عرض البسملة باستثناء سورة التوبة */}
      {surahNumber !== 9 && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900 rounded-lg text-center">
          <p className="text-2xl" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
            ﴿بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ﴾
          </p>
        </div>
      )}
      
      {/* عرض التفسير */}
      {showTafsir && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900 rounded-lg">
          <h3 className="text-lg font-bold mb-2 text-amber-800 dark:text-amber-400">
            تفسير الآية {currentAyah}
          </h3>
          
          {tafsirLoading ? (
            <div className="flex justify-center items-center p-4">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mr-2"></div>
              <div>جاري تحميل التفسير...</div>
            </div>
          ) : tafsirError ? (
            <div className="text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 inline ml-1" />
              {tafsirError}
            </div>
          ) : (
            <p className="text-gray-800 dark:text-gray-200" dir="rtl">{tafsirText}</p>
          )}
        </div>
      )}
      
      {/* عرض الآيات */}
      <div className="space-y-4">
        {surah.ayahs && surah.ayahs.map((ayah) => (
          <div 
            key={ayah.number}
            ref={el => ayahRefs.current[ayah.numberInSurah] = el}
            onClick={() => handleAyahClick(ayah.numberInSurah)}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              currentAyah === ayah.numberInSurah
                ? 'bg-emerald-100 dark:bg-emerald-900 border-r-4 border-emerald-600'
                : 'bg-gray-50 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950'
            }`}
          >
            <div className="flex justify-between mb-2">
              <span className="inline-block bg-emerald-600 text-white w-8 h-8 rounded-full flex items-center justify-center">
                {ayah.numberInSurah}
              </span>
              
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(ayah.numberInSurah);
                  }}
                  className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  title="استماع للآية"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    saveBookmark(ayah.numberInSurah);
                  }}
                  className={`${bookmark === ayah.numberInSurah ? 'bg-yellow-500' : 'bg-amber-600'} text-white rounded-full w-8 h-8 flex items-center justify-center`}
                  title="إضافة علامة مرجعية"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    shareAyah(ayah.numberInSurah);
                  }}
                  className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  title="مشاركة الآية"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-lg md:text-xl text-right leading-loose" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {ayah.text}
            </p>
          </div>
        ))}
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
    </div>
  );
};

// آخر قراءة
const LastReading = () => {
  const [bookmark, setBookmark] = useState(null);

  useEffect(() => {
    // استرجاع آخر قراءة من التخزين المحلي
    try {
      const bookmarks = JSON.parse(localStorage.getItem('quran-bookmarks')) || {};
      const surahNumbers = Object.keys(bookmarks);
      
      if (surahNumbers.length > 0) {
        // آخر سورة تمت قراءتها
        const lastSurah = surahNumbers[surahNumbers.length - 1];
        const ayahNumber = bookmarks[lastSurah];
        
        // جلب معلومات السورة
        fetch(`${APP_CONFIG.quranAPI}surah/${lastSurah}`)
          .then(response => response.json())
          .then(data => {
            if (data.code === 200 && data.data) {
              setBookmark({
                surah: data.data,
                ayahNumber: ayahNumber,
                // البحث عن الآية
                ayahText: data.data.ayahs.find(a => a.numberInSurah === ayahNumber)?.text || 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'
              });
            }
          });
      }
    } catch (error) {
      console.error("خطأ في استرجاع آخر قراءة:", error);
    }
  }, []);

  if (!bookmark) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-10">
        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-500">آخر قراءة</h2>
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          لا توجد قراءة سابقة. ابدأ بقراءة القرآن الكريم الآن.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-500">آخر قراءة</h2>
        <button className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center">
          متابعة القراءة 
          <span className="mr-1">←</span>
        </button>
      </div>
      
      <div className="p-4 mb-3 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center">
        <p className="text-xl" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
          {bookmark.ayahText}
        </p>
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>سورة {bookmark.surah.name} - الآية {bookmark.ayahNumber}</span>
        <span>آخر قراءة: اليوم {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

// التذييل
const Footer = ({ config }) => {
  return (
    <footer className="mt-auto py-4 border-t border-gray-200 dark:border-gray-700 text-center">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center">
          <p className="text-gray-700 dark:text-gray-300 font-bold">
            {config.copyright.owner}
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
            <a href={`tel:${config.copyright.phone}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
              <span className="ml-1">📞</span>
              {config.copyright.phone}
            </a>
            <a href={`mailto:${config.copyright.email}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
              <span className="ml-1">✉️</span>
              {config.copyright.email}
            </a>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {config.copyright.location}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
            {config.copyright.rights} &copy; {config.copyright.year} | الإصدار {config.version}
          </p>
        </div>
      </div>
    </footer>
  );
};

// التطبيق الرئيسي
const QuranApp = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('ar');
  const [currentSection, setCurrentSection] = useState('home');
  const [loading, setLoading] = useState(true);
  
  // في التطبيق الحقيقي، يمكن استخدام localStorage لحفظ إعدادات المستخدم
  useEffect(() => {
    // التحقق من تفضيلات وضع الظلام بالنظام
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
    
    // محاكاة تحميل البيانات
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // تبديل وضع الظلام
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // تغيير اللغة
  const handleLanguageChange = (code) => {
    setLanguage(code);
  };
  
  // عرض القسم الحالي
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'quran':
        return <QuranSection />;
      case 'memorization':
        return <MemorizationCircles />;
      case 'learn-reading':
        return <LearnReadingSection />;
      case 'virtual-classes':
        return <VirtualClassesSection />;
      case 'educational':
        return <EducationalResourcesSection />;
      case 'ask-scholars':
        return <AskScholarsSection />;
      default:
        return (
          <>
            <PrayerTimes />
            <MainSections onSectionSelect={setCurrentSection} />
            <LastReading />
          </>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-900 to-emerald-700 z-50">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white bg-opacity-20 flex items-center justify-center animate-pulse">
              <span className="text-5xl">📖</span>
            </div>
            <h1 className="text-4xl font-bold text-white">تطبيق القرآن الكريم التعليمي</h1>
            <p className="text-xl text-white mt-2">المنصة الشاملة للتعليم والتحفيظ</p>
          </div>
          
          <div className="w-64 h-2 bg-white bg-opacity-30 rounded-full mx-auto overflow-hidden relative">
            <div className="h-full bg-white rounded-full absolute left-0 top-0 animate-pulse" style={{ width: '60%' }}></div>
          </div>
          
          <div className="mt-8 text-white">
            <p className="text-lg font-bold">{APP_CONFIG.developer}</p>
            <p className="text-sm mt-1">
              <span className="ml-1">📞</span> {APP_CONFIG.copyright.phone} |
              <span className="ml-1">✉️</span> {APP_CONFIG.copyright.email}
            </p>
            <p className="text-sm mt-1">{APP_CONFIG.copyright.location}</p>
            <p className="text-xs mt-3">{APP_CONFIG.copyright.rights} &copy; {APP_CONFIG.copyright.year}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`} dir={LANGUAGES.find(lang => lang.code === language)?.direction || 'rtl'}>
      {/* رأس الصفحة */}
      <header className="bg-emerald-700 dark:bg-emerald-900 text-white py-2 px-4 shadow-md sticky top-0 z-10">
        <div className="container mx-auto flex flex-wrap justify-between items-center">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex items-center cursor-pointer" onClick={() => setCurrentSection('home')}>
              <span className="text-2xl ml-2">📖</span>
              <span className="font-bold hidden md:block">{APP_CONFIG.name}</span>
            </div>
            
            <div className="flex items-center">
              <label htmlFor="language" className="text-sm font-medium text-white ml-2">اللغة:</label>
              <select 
                id="language" 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-emerald-800 text-white rounded border border-emerald-900 text-sm py-1"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-emerald-800 hover:bg-emerald-900"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
      
      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {currentSection !== 'home' && (
          <div className="mb-4">
            <button 
              onClick={() => setCurrentSection('home')}
              className="flex items-center text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span className="mr-1 rtl:order-1">→</span>
              العودة للرئيسية
            </button>
          </div>
        )}
        
        {renderCurrentSection()}
      </main>
      
      {/* التذييل */}
      <Footer config={APP_CONFIG} />
    </div>
  );
};

// مكون صفحة حلقات التحفيظ
const MemorizationCircles = () => {
  const [circles, setCircles] = useState([
    { id: 1, name: 'حلقة الإمام نافع', teacher: 'الشيخ أحمد محمد', level: 'متقدم', members: 12, schedule: 'السبت والاثنين 8 مساءً', availableSeats: 3, imgUrl: '/api/placeholder/80/80' },
    { id: 2, name: 'حلقة تعليم المبتدئين', teacher: 'الشيخ عبدالله محمود', level: 'مبتدئ', members: 20, schedule: 'الأحد والأربعاء 7 مساءً', availableSeats: 5, imgUrl: '/api/placeholder/80/80' },
    { id: 3, name: 'حلقة جزء عم', teacher: 'الشيخة نورة الأحمد', level: 'متوسط', members: 15, schedule: 'يوميًا 9 صباحًا', availableSeats: 0, imgUrl: '/api/placeholder/80/80' },
    { id: 4, name: 'حلقة الإتقان والتجويد', teacher: 'الشيخ سعد العمري', level: 'متقدم', members: 8, schedule: 'الثلاثاء والخميس 6 مساءً', availableSeats: 7, imgUrl: '/api/placeholder/80/80' },
  ]);
  
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [toast, setToast] = useState(null);
  
  const handleJoinCircle = (circleId) => {
    const circle = circles.find(c => c.id === circleId);
    if (circle) {
      if (circle.availableSeats > 0) {
        setSelectedCircle(circle);
        setShowJoinForm(true);
      } else {
        setToast({
          message: 'عذراً، لا توجد مقاعد متاحة في هذه الحلقة حالياً.',
          type: 'warning'
        });
      }
    }
  };

  const clearToast = () => {
    setToast(null);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
          حلقات التحفيظ المتاحة
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400">
          انضم إلى إحدى حلقات التحفيظ وابدأ رحلة التعلم والتحفيظ مع مدرسين متخصصين
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {circles.map(circle => (
          <div key={circle.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white p-3">
              <h3 className="font-bold text-lg">{circle.name}</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-3">
                <img 
                  src={circle.imgUrl} 
                  alt={circle.teacher} 
                  className="w-12 h-12 rounded-full ml-3"
                />
                <div>
                  <div className="font-bold">{circle.teacher}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{circle.level}</div>
                </div>
              </div>
              
              <div className="mb-2">
                <span className="font-bold ml-2">المواعيد:</span>
                <span>{circle.schedule}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold ml-2">عدد الأعضاء:</span>
                <span>{circle.members}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold ml-2">المقاعد المتاحة:</span>
                <span className={circle.availableSeats > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {circle.availableSeats > 0 ? circle.availableSeats : 'مكتملة'}
                </span>
              </div>
              <div className="flex justify-center">
                <button 
                  className={`${
                    circle.availableSeats > 0 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  } text-white px-4 py-2 rounded-lg`}
                  onClick={() => handleJoinCircle(circle.id)}
                  disabled={circle.availableSeats === 0}
                >
                  {circle.availableSeats > 0 ? 'انضمام للحلقة' : 'الحلقة مكتملة'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-6">
        <button 
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg"
          onClick={() => setToast({
            message: 'سيتم إتاحة إنشاء حلقات تحفيظ جديدة قريبًا',
            type: 'info'
          })}
        >
          إنشاء حلقة تحفيظ جديدة
        </button>
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
    </div>
  );
};

// مكون صفحة تعلم القراءة التفاعلي
const LearnReadingSection = () => {
  const [currentView, setCurrentView] = useState('lessons'); // 'lessons', 'lesson-details', 'quiz'
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  const audioRef = useRef(null);
  
  // بيانات الدروس المفصلة
  const lessons = [
    { 
      id: 1, 
      title: 'تعلم مخارج الحروف', 
      description: 'تعلم النطق الصحيح للحروف العربية من مخارجها الأصلية',
      level: 'مبتدئ', 
      duration: '30 دقيقة', 
      image: '/api/placeholder/400/200',
      steps: [
        {
          title: 'المخارج الحلقية',
          content: 'المخارج الحلقية هي أماكن خروج أصوات الحروف من الحلق، وتشمل ثلاثة مخارج: أقصى الحلق (الهمزة والهاء)، وسط الحلق (العين والحاء)، وأدنى الحلق (الغين والخاء).',
          audioExample: 'مثال للحروف الحلقية',
          exercise: 'قم بنطق هذه الكلمات مع التركيز على الحروف الحلقية: أَحَد، عَهْد، خَالِق، غَفَر',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'مخارج اللسان',
          content: 'تُخرج معظم الحروف العربية من اللسان، وهي تنقسم إلى عدة مخارج: أقصى اللسان (القاف والكاف)، وسط اللسان (الجيم والشين والياء)، وحافة اللسان (الضاد)، وطرف اللسان (اللام والنون والراء والطاء والدال والتاء والصاد والسين والزاي والظاء والذال والثاء).',
          audioExample: 'مثال للحروف اللسانية',
          exercise: 'قم بنطق هذه الكلمات مع التركيز على مخارج اللسان: قَلَم، كَرِيم، جَمِيل، زَمَان',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'مخارج الشفتين',
          content: 'تخرج الحروف الشفوية من الشفتين، وهي: الفاء (من باطن الشفة السفلى مع أطراف الثنايا العليا)، الباء والميم والواو (من الشفتين معاً).',
          audioExample: 'مثال للحروف الشفوية',
          exercise: 'قم بنطق هذه الكلمات مع التركيز على الحروف الشفوية: بَاب، مَاء، وَاحِد، فَتْح',
          image: '/api/placeholder/400/200'
        }
      ],
      quiz: [
        {
          question: 'من أي مخرج تخرج حروف (ء، هـ)؟',
          options: ['أقصى الحلق', 'وسط الحلق', 'أدنى الحلق', 'اللسان'],
          correctAnswer: 'أقصى الحلق'
        },
        {
          question: 'أي من هذه الحروف يخرج من الشفتين؟',
          options: ['ع', 'ب', 'د', 'ق'],
          correctAnswer: 'ب'
        },
        {
          question: 'من أي مخرج تخرج حروف (ض، ص، س)؟',
          options: ['الحلق', 'الشفتين', 'اللسان', 'الجوف'],
          correctAnswer: 'اللسان'
        },
        {
          question: 'كم عدد المخارج الرئيسية للحروف العربية؟',
          options: ['3 مخارج', '5 مخارج', '17 مخرجاً', '28 مخرجاً'],
          correctAnswer: '5 مخارج'
        },
        {
          question: 'أي من هذه الحروف يخرج من أدنى الحلق؟',
          options: ['ء', 'ح', 'خ', 'ج'],
          correctAnswer: 'خ'
        }
      ]
    },
    { 
      id: 2, 
      title: 'أحكام النون الساكنة والتنوين', 
      description: 'شرح مفصل لأحكام النون الساكنة والتنوين: الإظهار، الإدغام، الإخفاء، والإقلاب',
      level: 'متوسط', 
      duration: '45 دقيقة', 
      image: '/api/placeholder/400/200',
      steps: [
        {
          title: 'الإظهار',
          content: 'الإظهار هو نطق النون الساكنة أو التنوين بوضوح دون غنة مع الحروف الحلقية الستة (ء، هـ، ع، ح، غ، خ). مثل: مَنْ هَذَا، مِنْ عِلْمٍ.',
          audioExample: 'مثال للإظهار',
          exercise: 'قم بقراءة هذه الآية مع التركيز على إظهار النون الساكنة: ﴿مِنْ حَكِيمٍ حَمِيدٍ﴾',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'الإدغام',
          content: 'الإدغام هو إدخال النون الساكنة أو التنوين في الحرف التالي، وينقسم إلى: إدغام بغنة مع حروف (ي، ن، م، و)، وإدغام بلا غنة مع حروف (ل، ر).',
          audioExample: 'مثال للإدغام',
          exercise: 'قم بقراءة هذه الآية مع التركيز على الإدغام: ﴿مِن نُّورٍ﴾، ﴿مِن رَّبِّهِمْ﴾',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'الإقلاب',
          content: 'الإقلاب هو قلب النون الساكنة أو التنوين إلى ميم مخفاة عند حرف الباء. مثل: مِنْ بَعْدِ، سَمِيعٌ بَصِيرٌ.',
          audioExample: 'مثال للإقلاب',
          exercise: 'قم بقراءة هذه الآية مع التركيز على الإقلاب: ﴿مِن بَعْدِ﴾، ﴿سَمِيعٌ بَصِيرٌ﴾',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'الإخفاء',
          content: 'الإخفاء هو نطق النون الساكنة أو التنوين بصفة بين الإظهار والإدغام مع غنة عند باقي الحروف (15 حرفاً) مثل: مِنْ قَبْلِ، عَنْ صَلاتِهِمْ.',
          audioExample: 'مثال للإخفاء',
          exercise: 'قم بقراءة هذه الآية مع التركيز على الإخفاء: ﴿مِن قَبْلِكُمْ﴾، ﴿مِن طِينٍ﴾',
          image: '/api/placeholder/400/200'
        }
      ],
      quiz: [
        {
          question: 'ما هو حكم النون الساكنة عند حروف الإظهار؟',
          options: ['الإخفاء', 'الإدغام', 'الإظهار', 'الإقلاب'],
          correctAnswer: 'الإظهار'
        },
        {
          question: 'عند أي حرف يكون إقلاب النون الساكنة أو التنوين؟',
          options: ['الميم', 'الباء', 'الفاء', 'الواو'],
          correctAnswer: 'الباء'
        },
        {
          question: 'ما هي حروف الإدغام بغنة؟',
          options: ['ي ن م و', 'ل ر', 'ء هـ ع ح غ خ', 'ب ت ث'],
          correctAnswer: 'ي ن م و'
        },
        {
          question: 'ما هو حكم النون الساكنة في كلمة "مِنْ قَبْلِ"؟',
          options: ['الإظهار', 'الإدغام', 'الإخفاء', 'الإقلاب'],
          correctAnswer: 'الإخفاء'
        },
        {
          question: 'ما هو حكم التنوين في كلمة "سَمِيعٌ بَصِيرٌ"؟',
          options: ['الإظهار', 'الإدغام', 'الإخفاء', 'الإقلاب'],
          correctAnswer: 'الإقلاب'
        }
      ]
    },
    { 
      id: 3, 
      title: 'المدود وأنواعها', 
      description: 'تعلم أنواع المدود في القرآن الكريم وكيفية تطبيقها أثناء التلاوة',
      level: 'متوسط', 
      duration: '40 دقيقة', 
      image: '/api/placeholder/400/200',
      steps: [
        {
          title: 'المد الطبيعي',
          content: 'المد الطبيعي هو مد حروف المد الثلاثة (الألف، الواو، الياء) بمقدار حركتين من غير زيادة. مثل: قَالَ، يَقُولُ، فِي.',
          audioExample: 'مثال للمد الطبيعي',
          exercise: 'قم بقراءة هذه الكلمات مع تطبيق المد الطبيعي: قَالَ، نُوحٌ، فِي',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'المد المتصل',
          content: 'المد المتصل هو أن يأتي حرف المد وبعده همزة في كلمة واحدة، ويمد من 4 إلى 5 حركات. مثل: جَاءَ، سُوءَ، جِيءَ.',
          audioExample: 'مثال للمد المتصل',
          exercise: 'قم بقراءة هذه الكلمات مع تطبيق المد المتصل: جَاءَ، السُّوءَ، سِيءَ',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'المد المنفصل',
          content: 'المد المنفصل هو أن يأتي حرف المد في آخر كلمة وتأتي الهمزة في أول الكلمة التالية، ويمد من 4 إلى 5 حركات. مثل: يَا أَيُّهَا، فِي أَنفُسِكُمْ.',
          audioExample: 'مثال للمد المنفصل',
          exercise: 'قم بقراءة هذه الآية مع تطبيق المد المنفصل: ﴿يَا أَيُّهَا النَّاسُ﴾، ﴿قُوا أَنفُسَكُمْ﴾',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'مد اللين',
          content: 'مد اللين هو أن يأتي حرف من حروف اللين (الواو والياء الساكنتان المفتوح ما قبلهما) وبعده سكون عارض للوقف. مثل: خَوْف، بَيْت.',
          audioExample: 'مثال لمد اللين',
          exercise: 'قم بقراءة هذه الكلمات مع تطبيق مد اللين عند الوقف: قُرَيْش، خَوْف',
          image: '/api/placeholder/400/200'
        }
      ],
      quiz: [
        {
          question: 'كم يمد المد الطبيعي؟',
          options: ['حركتان', '4 حركات', '6 حركات', 'حركة واحدة'],
          correctAnswer: 'حركتان'
        },
        {
          question: 'ما هو المد المتصل؟',
          options: [
            'أن يأتي حرف المد وبعده همزة في كلمة واحدة',
            'أن يأتي حرف المد في آخر كلمة والهمزة في أول الكلمة التالية',
            'أن يأتي حرف المد وبعده سكون',
            'أن يأتي حرف المد في كلمة منفصلة'
          ],
          correctAnswer: 'أن يأتي حرف المد وبعده همزة في كلمة واحدة'
        },
        {
          question: 'ما مقدار المد المنفصل؟',
          options: ['حركتان', '4-5 حركات', '6 حركات', '2-4 حركات'],
          correctAnswer: '4-5 حركات'
        },
        {
          question: 'ما هي حروف المد؟',
          options: [
            'الألف، الواو، الياء',
            'الألف، الواو، الهمزة',
            'الألف، الياء، الهاء',
            'الواو، الياء، الهمزة'
          ],
          correctAnswer: 'الألف، الواو، الياء'
        },
        {
          question: 'ما نوع المد في كلمة "جَاءَ"؟',
          options: ['مد طبيعي', 'مد متصل', 'مد منفصل', 'مد لين'],
          correctAnswer: 'مد متصل'
        }
      ]
    },
    { 
      id: 4, 
      title: 'أحكام الوقف والابتداء', 
      description: 'تعلم أحكام الوقف والابتداء في القرآن الكريم وعلامات الوقف',
      level: 'متقدم', 
      duration: '50 دقيقة', 
      image: '/api/placeholder/400/200',
      steps: [
        {
          title: 'أنواع الوقف',
          content: 'الوقف هو قطع الصوت عن الكلمة القرآنية زمناً يتنفس فيه القارئ بنية استئناف القراءة. وينقسم إلى: الوقف التام، الوقف الكافي، الوقف الحسن، والوقف القبيح.',
          audioExample: 'مثال لأنواع الوقف',
          exercise: 'قم بقراءة هذه الآيات مع مراعاة الوقف المناسب عند علامات الوقف',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'علامات الوقف',
          content: 'علامات الوقف في المصحف الشريف هي رموز توضع فوق الكلمات لتبين حكم الوقف عندها. ومنها: م (وقف لازم)، قلى (وقف أولى)، صلى (وصل أولى)، ج (وقف جائز)، ز (وقف مجوز)، لا (وقف ممنوع).',
          audioExample: 'أمثلة على علامات الوقف',
          exercise: 'قم بالتعرف على علامات الوقف المختلفة في المصحف وتطبيقها أثناء القراءة',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'أحكام الوقف على أواخر الكلمات',
          content: 'عند الوقف على أواخر الكلمات يتم تسكين آخر حرف، وإذا كان الحرف الأخير تاء مربوطة فتوقف عليها بالهاء، وإذا كان الحرف الأخير منوناً فيوقف عليه بالسكون على الحرف الذي قبل التنوين.',
          audioExample: 'أمثلة على الوقف على أواخر الكلمات',
          exercise: 'قم بقراءة هذه الكلمات مع تطبيق أحكام الوقف: المؤمنون (المؤمنونْ)، رحمة (رحمهْ)، كتاباً (كتابا)',
          image: '/api/placeholder/400/200'
        },
        {
          title: 'الابتداء وأحكامه',
          content: 'الابتداء هو الشروع في القراءة بعد قطعها، سواء كان ذلك في بداية السورة أو في أثنائها بعد الوقف. ويجب الحرص على الابتداء بما يصح الابتداء به ويتم به المعنى.',
          audioExample: 'أمثلة على الابتداء',
          exercise: 'تدرب على الابتداء بعد الوقف في أماكن مختلفة من الآيات مع مراعاة تمام المعنى',
          image: '/api/placeholder/400/200'
        }
      ],
      quiz: [
        {
          question: 'ما هي علامة الوقف اللازم في المصحف؟',
          options: ['لا', 'م', 'ج', 'صلى'],
          correctAnswer: 'م'
        },
        {
          question: 'ماذا نفعل عند الوقف على التاء المربوطة؟',
          options: ['نوقف عليها بالتاء الساكنة', 'نوقف عليها بالهاء', 'نتركها كما هي', 'نحذفها'],
          correctAnswer: 'نوقف عليها بالهاء'
        },
        {
          question: 'ماذا تعني علامة (لا) في المصحف؟',
          options: ['وقف لازم', 'وقف جائز', 'وقف حسن', 'وقف ممنوع'],
          correctAnswer: 'وقف ممنوع'
        },
        {
          question: 'ما هو الوقف التام؟',
          options: [
            'هو الوقف على كلمة تم المعنى بها وتعلقت بما بعدها معنىً لا لفظاً',
            'هو الوقف على كلمة تم المعنى بها ولم تتعلق بما بعدها لا لفظاً ولا معنىً',
            'هو الوقف على كلمة لم يتم المعنى بها',
            'هو الوقف على كلمة تم المعنى بها وتعلقت بما بعدها لفظاً ومعنىً'
          ],
          correctAnswer: 'هو الوقف على كلمة تم المعنى بها ولم تتعلق بما بعدها لا لفظاً ولا معنىً'
        },
        {
          question: 'كيف نقف على كلمة منونة بالفتح مثل "كتاباً"؟',
          options: [
            'نقف عليها بالتنوين: كتاباً',
            'نقف عليها بالألف: كتابا',
            'نقف عليها بالسكون: كتابْ',
            'نقف عليها بالتاء: كتابت'
          ],
          correctAnswer: 'نقف عليها بالألف: كتابا'
        }
      ]
    },
  ];
  
  const handleStartLesson = (lesson) => {
    setSelectedLesson(lesson);
    setCurrentStep(1);
    setCurrentView('lesson-details');
    setQuizScore(null);
    setQuizAnswers({});
  };
  
  const handleNextStep = () => {
    if (currentStep < selectedLesson.steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // الانتقال إلى الاختبار بعد إكمال جميع الخطوات
      setCurrentView('quiz');
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleReturn = () => {
    if (currentView === 'lesson-details') {
      setCurrentView('lessons');
    } else if (currentView === 'quiz') {
      setCurrentView('lesson-details');
    }
  };
  
  const handleAnswerSelect = (questionIndex, answer) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionIndex]: answer
    });
  };
  
  const handleSubmitQuiz = () => {
    // حساب النتيجة
    let correctCount = 0;
    selectedLesson.quiz.forEach((question, index) => {
      if (quizAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / selectedLesson.quiz.length) * 100);
    setQuizScore(score);
    
    // إظهار رسالة النتيجة
    setToast({
      message: `حصلت على ${score}% في اختبار ${selectedLesson.title}`,
      type: score >= 70 ? 'success' : 'warning'
    });
  };
  
  const playAudio = (audioFile) => {
    // في التطبيق الحقيقي، يمكن استخدام ملفات صوتية حقيقية
    if (audioRef.current) {
      audioRef.current.pause();
      // يمكن استبدال هذا برابط ملف صوتي حقيقي
      audioRef.current.src = "https://www.example.com/audio/" + audioFile;
      audioRef.current.play()
        .catch(error => {
          console.error("خطأ في تشغيل الصوت:", error);
          setToast({
            message: "تعذر تشغيل الصوت. سيتم توفير ملفات صوتية في الإصدار القادم.",
            type: 'info'
          });
        });
    }
  };
  
  const clearToast = () => {
    setToast(null);
  };
  
  // عرض قائمة الدروس
  if (currentView === 'lessons') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
            تعلم القراءة والتجويد
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            دروس تفاعلية في القراءة الصحيحة وعلوم التجويد مع تمارين واختبارات
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {lessons.map(lesson => (
            <div key={lesson.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-md">
              <img src={lesson.image} alt={lesson.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 text-emerald-800 dark:text-emerald-500">{lesson.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{lesson.description}</p>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span>المستوى: {lesson.level}</span>
                  <span>المدة: {lesson.duration}</span>
                </div>
                <button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg"
                  onClick={() => handleStartLesson(lesson)}
                >
                  ابدأ الدرس
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-lg mb-2 text-amber-800 dark:text-amber-400">مسار التعلم المقترح</h3>
          <p className="mb-4 text-gray-800 dark:text-gray-200">
            لتعلم التجويد بشكل متكامل، ننصح باتباع الدروس بالترتيب المذكور أعلاه والتأكد من إتقان كل درس قبل الانتقال للدرس التالي.
          </p>
          <div className="flex flex-wrap gap-2">
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="flex items-center">
                <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center ml-1">
                  {index + 1}
                </div>
                <span className="text-amber-800 dark:text-amber-400">{lesson.title}</span>
                {index < lessons.length - 1 && <span className="mx-2">→</span>}
              </div>
            ))}
          </div>
        </div>
        
        <audio ref={audioRef} className="hidden" />
        
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={clearToast} 
          />
        )}
      </div>
    );
  }
  
  // عرض تفاصيل الدرس
  if (currentView === 'lesson-details' && selectedLesson) {
    const currentStepData = selectedLesson.steps[currentStep - 1];
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleReturn}
            className="flex items-center text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4 ml-1" />
            العودة للدروس
          </button>
          
          <div className="text-gray-600 dark:text-gray-400">
            الخطوة {currentStep} من {selectedLesson.steps.length}
          </div>
        </div>
        
        <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
            {selectedLesson.title}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            {currentStepData.title}
          </p>
        </div>
        
        <div className="mb-6">
          <img src={currentStepData.image} alt={currentStepData.title} className="w-full h-64 object-cover rounded-lg mb-4" />
          
          <div className="bg-emerald-50 dark:bg-emerald-900 p-4 rounded-lg mb-4">
            <h3 className="font-bold text-lg mb-2 text-emerald-800 dark:text-emerald-400">المحتوى</h3>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {currentStepData.content}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
            <h3 className="font-bold text-lg mb-2 text-blue-800 dark:text-blue-400">مثال صوتي</h3>
            <div className="flex items-center">
              <button 
                onClick={() => playAudio(currentStepData.audioExample)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Volume2 className="w-5 h-5 ml-2" />
                استمع للمثال
              </button>
              <p className="mr-4 text-blue-800 dark:text-blue-200">
                {currentStepData.audioExample}
              </p>
            </div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2 text-amber-800 dark:text-amber-400">تمرين</h3>
            <p className="text-gray-800 dark:text-gray-200 mb-4">
              {currentStepData.exercise}
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => setToast({
                  message: 'حاول تسجيل صوتك وممارسة التمرين. سيتم توفير ميزة التسجيل والتقييم قريبًا!',
                  type: 'info'
                })}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
              >
                تسجيل المحاولة
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <button 
            onClick={handlePrevStep}
            className={`px-4 py-2 rounded-lg ${currentStep > 1 ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={currentStep <= 1}
          >
            السابق
          </button>
          
          {currentStep < selectedLesson.steps.length ? (
            <button 
              onClick={handleNextStep}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              التالي
            </button>
          ) : (
            <button 
              onClick={handleNextStep}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              الانتقال للاختبار
            </button>
          )}
        </div>
        
        <audio ref={audioRef} className="hidden" />
        
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={clearToast} 
          />
        )}
      </div>
    );
  }
  
  // عرض الاختبار
  if (currentView === 'quiz' && selectedLesson) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleReturn}
            className="flex items-center text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4 ml-1" />
            العودة للدرس
          </button>
          
          <div className="text-gray-600 dark:text-gray-400">
            اختبار: {selectedLesson.title}
          </div>
        </div>
        
        <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
            اختبار {selectedLesson.title}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            اختر الإجابة الصحيحة لكل سؤال
          </p>
        </div>
        
        {quizScore !== null ? (
          <div className="mb-6">
            <div className={`p-4 rounded-lg mb-4 text-center ${
              quizScore >= 70 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                               'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
            }`}>
              <h3 className="text-2xl font-bold mb-2">النتيجة: {quizScore}%</h3>
              <p>
                {quizScore >= 70 
                  ? 'أحسنت! لقد اجتزت الاختبار بنجاح.' 
                  : 'حاول مرة أخرى بعد مراجعة المادة.'}
              </p>
            </div>
            
            <div className="space-y-6">
              {selectedLesson.quiz.map((question, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-bold mb-3">السؤال {index + 1}: {question.question}</h4>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div 
                        key={optionIndex} 
                        className={`p-2 rounded-lg ${
                          quizAnswers[index] === option && option === question.correctAnswer
                            ? 'bg-green-100 dark:bg-green-900 border border-green-500'
                            : quizAnswers[index] === option && option !== question.correctAnswer
                            ? 'bg-red-100 dark:bg-red-900 border border-red-500'
                            : option === question.correctAnswer
                            ? 'bg-green-50 dark:bg-green-950 border border-green-300'
                            : 'bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input 
                            type="radio" 
                            name={`question-${index}`} 
                            value={option}
                            checked={quizAnswers[index] === option}
                            onChange={() => {}} // قراءة فقط بعد تقديم الإجابات
                            className="ml-2"
                            disabled
                          />
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {quizAnswers[index] !== question.correctAnswer && (
                    <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                      الإجابة الصحيحة: {question.correctAnswer}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between mt-6">
              <button 
                onClick={() => {
                  setQuizAnswers({});
                  setQuizScore(null);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
              >
                إعادة الاختبار
              </button>
              
              <button 
                onClick={() => setCurrentView('lessons')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
              >
                العودة للدروس
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="space-y-6">
              {selectedLesson.quiz.map((question, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-bold mb-3">السؤال {index + 1}: {question.question}</h4>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div 
                        key={optionIndex} 
                        className={`p-2 rounded-lg ${
                          quizAnswers[index] === option
                            ? 'bg-emerald-100 dark:bg-emerald-900 border border-emerald-500'
                            : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input 
                            type="radio" 
                            name={`question-${index}`} 
                            value={option}
                            checked={quizAnswers[index] === option}
                            onChange={() => handleAnswerSelect(index, option)}
                            className="ml-2"
                          />
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-6">
              <button 
                onClick={handleSubmitQuiz}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg"
                disabled={Object.keys(quizAnswers).length < selectedLesson.quiz.length}
              >
                تقديم الإجابات
              </button>
            </div>
          </div>
        )}
        
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={clearToast} 
          />
        )}
      </div>
    );
  }
  
  // في حالة وجود خطأ
  return (
    <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg text-center">
      <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
      <div className="text-red-600 dark:text-red-400 font-bold mb-2">حدث خطأ غير متوقع!</div>
      <button 
        onClick={() => setCurrentView('lessons')}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
      >
        العودة للدروس
      </button>
    </div>
  );
};

// مكون الفصول الافتراضية
const VirtualClassesSection = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [toast, setToast] = useState(null);
  
  const upcomingClasses = [
    { id: 1, title: 'تفسير سورة البقرة', teacher: 'د. محمد السيد', date: '2025-03-20', time: '20:00', participants: 45 },
    { id: 2, title: 'شرح كتاب رياض الصالحين', teacher: 'د. أحمد العمري', date: '2025-03-22', time: '19:30', participants: 38 },
    { id: 3, title: 'أحكام التجويد المتقدمة', teacher: 'د. عبدالله الفهد', date: '2025-03-25', time: '18:00', participants: 22 },
  ];
  
  const recordedClasses = [
    { id: 1, title: 'أصول التفسير', teacher: 'د. عبدالله الفهد', date: '2025-03-12', views: 1250, duration: '01:25:30', thumbnail: '/api/placeholder/300/200' },
    { id: 2, title: 'علوم القرآن', teacher: 'د. فهد الحميد', date: '2025-03-05', views: 980, duration: '01:10:45', thumbnail: '/api/placeholder/300/200' },
    { id: 3, title: 'تفسير سورة يس', teacher: 'د. محمد السيد', date: '2025-03-01', views: 1520, duration: '01:30:15', thumbnail: '/api/placeholder/300/200' },
    { id: 4, title: 'مقدمة في علم القراءات', teacher: 'د. أحمد العمري', date: '2025-02-25', views: 750, duration: '00:55:20', thumbnail: '/api/placeholder/300/200' },
  ];
  
  // تنسيق التاريخ والوقت
  const formatDateTime = (dateStr, timeStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('ar-SA', options);
    return `${formattedDate} - الساعة ${timeStr}`;
  };
  
  const clearToast = () => {
    setToast(null);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
          الفصول والمحاضرات الافتراضية
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400">
          حضور مباشر ودروس مسجلة في مختلف علوم القرآن والشريعة
        </p>
      </div>
      
      <div className="flex border-b border-gray-300 dark:border-gray-700 mb-4">
        <button 
          className={`py-2 px-4 ${activeTab === 'upcoming' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-600 dark:text-gray-400'}`}
          onClick={() => setActiveTab('upcoming')}
        >
          المحاضرات القادمة
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'recorded' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-600 dark:text-gray-400'}`}
          onClick={() => setActiveTab('recorded')}
        >
          المحاضرات المسجلة
        </button>
      </div>
      
      {activeTab === 'upcoming' ? (
        <div className="space-y-4">
          {upcomingClasses.map(cls => (
            <div key={cls.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex flex-wrap justify-between">
                <div>
                  <h4 className="font-bold text-lg">{cls.title}</h4>
                  <p className="text-gray-600 dark:text-gray-400">المحاضر: {cls.teacher}</p>
                </div>
                <div className="text-left">
                  <p className="text-gray-600 dark:text-gray-400">{formatDateTime(cls.date, cls.time)}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">المشاركون: {cls.participants}</span>
                <button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded-lg"
                  onClick={() => setToast({
                    message: 'سيتم فتح التسجيل للمحاضرات قريبًا',
                    type: 'info'
                  })}
                >
                  تسجيل حضور
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recordedClasses.map(cls => (
            <div key={cls.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div 
                className="relative h-40 bg-gray-200 dark:bg-gray-700 cursor-pointer"
                onClick={() => setToast({
                  message: 'ستتوفر المحاضرات المسجلة قريبًا',
                  type: 'info'
                })}
              >
                <img src={cls.thumbnail} alt={cls.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center opacity-90">
                    <span className="text-xl">▶</span>
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {cls.duration}
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-bold">{cls.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{cls.teacher}</p>
                <div className="flex justify-between mt-2 text-sm">
                  <span>{new Date(cls.date).toLocaleDateString('ar-SA')}</span>
                  <span>{cls.views} مشاهدة</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
    </div>
  );
};

// مكون المواد التعليمية
const EducationalResourcesSection = () => {
  const [toast, setToast] = useState(null);
  
  const categories = [
    { id: 'quran', name: 'علوم القرآن', count: 24 },
    { id: 'hadith', name: 'علوم الحديث', count: 18 },
    { id: 'fiqh', name: 'الفقه الإسلامي', count: 32 },
    { id: 'aqidah', name: 'العقيدة', count: 15 },
    { id: 'seerah', name: 'السيرة النبوية', count: 22 },
  ];
  
  const resources = [
    { id: 1, title: 'أصول التفسير وقواعده', author: 'د. خالد السبت', type: 'كتاب PDF', size: '4.2 ميجابايت', downloads: 1250 },
    { id: 2, title: 'شرح أصول علم التجويد', author: 'د. أيمن سويد', type: 'ملف صوتي', size: '120 ميجابايت', downloads: 860 },
    { id: 3, title: 'مصحف المدينة المنورة', author: 'مجمع الملك فهد', type: 'PDF', size: '12 ميجابايت', downloads: 2450 },
    { id: 4, title: 'خرائط ذهنية لسور القرآن', author: 'د. سلمان العودة', type: 'صور', size: '8.5 ميجابايت', downloads: 720 },
  ];
  
  const clearToast = () => {
    setToast(null);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
          المواد التعليمية
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400">
          مكتبة شاملة من المصادر لتعزيز معرفتك بالقرآن الكريم وعلومه
        </p>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <div key={category.id} className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-800">
            {category.name} ({category.count})
          </div>
        ))}
      </div>
      
      <div className="space-y-4 mb-6">
        {resources.map(resource => (
          <div key={resource.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold text-lg">{resource.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">المؤلف: {resource.author}</p>
              </div>
              <div className="text-left">
                <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded">
                  {resource.type}
                </span>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="ml-3">الحجم: {resource.size}</span>
                <span>التحميلات: {resource.downloads}</span>
              </div>
              <button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded-lg text-sm"
                onClick={() => setToast({
                  message: 'ستتوفر خدمة تحميل المواد قريبًا',
                  type: 'info'
                })}
              >
                تحميل
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-6">
        <button 
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg"
          onClick={() => setToast({
            message: 'جاري إضافة المزيد من المواد التعليمية',
            type: 'info'
          })}
        >
          عرض المزيد من المواد
        </button>
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
    </div>
  );
};

// مكون اسأل العلماء
const AskScholarsSection = () => {
  const [toast, setToast] = useState(null);
  
  const scholars = [
    { id: 1, name: 'د. عبدالرحمن السديس', specialty: 'علوم القرآن والتفسير', available: true, image: '/api/placeholder/80/80' },
    { id: 2, name: 'د. سلمان العودة', specialty: 'الفقه وأصوله', available: false, image: '/api/placeholder/80/80' },
    { id: 3, name: 'د. محمد العريفي', specialty: 'العقيدة والحديث', available: true, image: '/api/placeholder/80/80' },
    { id: 4, name: 'د. نجلاء المبارك', specialty: 'علوم القرآن والتجويد', available: true, image: '/api/placeholder/80/80' },
  ];
  
  const recentQuestions = [
    { id: 1, question: 'ما حكم قراءة القرآن من الجوال بدون وضوء؟', scholar: 'د. عبدالرحمن السديس', date: 'منذ 3 أيام', answers: 2 },
    { id: 2, question: 'كيف أحفظ القرآن مع انشغالي بالدراسة؟', scholar: 'د. نجلاء المبارك', date: 'منذ أسبوع', answers: 1 },
    { id: 3, question: 'ما هي أفضل طريقة لحفظ المتشابهات؟', scholar: 'د. محمد العريفي', date: 'منذ أسبوعين', answers: 3 },
  ];
  
  const clearToast = () => {
    setToast(null);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-center text-emerald-800 dark:text-emerald-500">
          اسأل أهل العلم
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400">
          تواصل مباشرة مع العلماء والمشايخ للإجابة على أسئلتك
        </p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-3 text-emerald-700 dark:text-emerald-400">العلماء المتاحون</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scholars.map(scholar => (
            <div key={scholar.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center">
              <img src={scholar.image} alt={scholar.name} className="w-14 h-14 rounded-full ml-3" />
              <div className="flex-grow">
                <h4 className="font-bold">{scholar.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{scholar.specialty}</p>
              </div>
              <div>
                {scholar.available ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full inline-block ml-1"></span>
                    متاح الآن
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <span className="w-2 h-2 bg-gray-500 rounded-full inline-block ml-1"></span>
                    غير متاح
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-3 text-emerald-700 dark:text-emerald-400">أحدث الأسئلة</h3>
        <div className="space-y-4">
          {recentQuestions.map(question => (
            <div 
              key={question.id} 
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setToast({
                message: 'سيتم إتاحة قراءة الإجابات قريبًا',
                type: 'info'
              })}
            >
              <h4 className="font-bold text-lg mb-1">{question.question}</h4>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>الإجابة: {question.scholar}</span>
                <span>{question.date}</span>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">{question.answers} {question.answers > 1 ? 'إجابات' : 'إجابة'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-emerald-50 dark:bg-emerald-900 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-2 text-emerald-800 dark:text-emerald-400">لديك سؤال؟</h3>
        <textarea 
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          rows="3"
          placeholder="اكتب سؤالك هنا..."
        ></textarea>
        <div className="flex justify-end">
          <button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            onClick={() => setToast({
              message: 'سيتم إتاحة خدمة الأسئلة قريبًا',
              type: 'info'
            })}
          >
            إرسال السؤال
          </button>
        </div>
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
    </div>
  );
};

export default QuranApp;