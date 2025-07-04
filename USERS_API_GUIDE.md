# دليل API إدارة المستخدمين

## نظرة عامة

تم إضافة نظام إدارة المستخدمين الكامل إلى النظام، يتيح للمديرين إدارة جميع المستخدمين في النظام.

## الصلاحيات المطلوبة

جميع endpoints تتطلب:
- **مصادقة**: Bearer Token صالح
- **صلاحية المدير**: role = "admin"

## API Endpoints

### 1. الحصول على قائمة المستخدمين
```http
GET /api/users
Authorization: Bearer {token}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "64a1b2c3d4e5f6789abc123",
        "username": "ahmed123",
        "fullName": "أحمد محمد علي",
        "email": "ahmed@example.com",
        "nationalId": "1234567890",
        "role": "user",
        "isActive": true,
        "lastLogin": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-01T09:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 1
  }
}
```

### 2. الحصول على مستخدم واحد
```http
GET /api/users/:id
Authorization: Bearer {token}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789abc123",
      "username": "ahmed123",
      "fullName": "أحمد محمد علي",
      "email": "ahmed@example.com",
      "nationalId": "1234567890",
      "role": "user",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T09:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 3. إنشاء مستخدم جديد
```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "newuser123",
  "password": "password123",
  "fullName": "مستخدم جديد",
  "email": "newuser@example.com",
  "nationalId": "9876543210",
  "role": "user"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6789abc124",
      "username": "newuser123",
      "fullName": "مستخدم جديد",
      "email": "newuser@example.com",
      "nationalId": "9876543210",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-16T10:00:00.000Z"
    }
  }
}
```

### 4. تحديث بيانات مستخدم
```http
PUT /api/users/:id
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "اسم محدث",
  "email": "updated@example.com",
  "role": "admin",
  "isActive": false
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789abc123",
      "username": "ahmed123",
      "fullName": "اسم محدث",
      "email": "updated@example.com",
      "nationalId": "1234567890",
      "role": "admin",
      "isActive": false,
      "updatedAt": "2024-01-16T10:00:00.000Z"
    }
  }
}
```

### 5. تبديل حالة المستخدم (تفعيل/إلغاء تفعيل)
```http
PUT /api/users/:id/toggle-status
Authorization: Bearer {token}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "User activated successfully",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789abc123",
      "username": "ahmed123",
      "fullName": "أحمد محمد علي",
      "isActive": true,
      "updatedAt": "2024-01-16T10:00:00.000Z"
    }
  }
}
```

### 6. حذف مستخدم
```http
DELETE /api/users/:id
Authorization: Bearer {token}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## معالجة الأخطاء

### أخطاء المصادقة والصلاحيات
```json
// غير مصادق
{
  "success": false,
  "message": "Not authorized to access this route"
}

// ليس مدير
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### أخطاء البيانات المكررة
```json
// اسم مستخدم مكرر
{
  "success": false,
  "error": "Username already exists"
}

// بريد إلكتروني مكرر
{
  "success": false,
  "error": "Email already exists"
}

// رقم هوية مكرر
{
  "success": false,
  "error": "National ID already exists"
}
```

### أخطاء التحقق من البيانات
```json
// حقول مفقودة
{
  "success": false,
  "error": "Please provide all required fields: username, password, fullName, email, and nationalId"
}

// مستخدم غير موجود
{
  "success": false,
  "error": "User not found"
}
```

### حماية العمليات الحساسة
```json
// محاولة حذف الحساب الخاص
{
  "success": false,
  "error": "You cannot delete your own account"
}

// محاولة إلغاء تفعيل الحساب الخاص
{
  "success": false,
  "error": "You cannot deactivate your own account"
}
```

## أمثلة على الاستخدام

### JavaScript/Fetch
```javascript
// الحصول على قائمة المستخدمين
const token = localStorage.getItem('token');

fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Users:', data.data.users);
  }
});

// إنشاء مستخدم جديد
const newUser = {
  username: 'testuser',
  password: 'password123',
  fullName: 'مستخدم تجريبي',
  email: 'test@example.com',
  nationalId: '1234567890',
  role: 'user'
};

fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newUser)
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('User created:', data.data.user);
  }
});
```

### cURL Examples
```bash
# الحصول على قائمة المستخدمين
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"

# إنشاء مستخدم جديد
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "fullName": "مستخدم جديد",
    "email": "newuser@example.com",
    "nationalId": "1234567890",
    "role": "user"
  }'

# تحديث مستخدم
curl -X PUT http://localhost:5000/api/users/USER_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "اسم محدث",
    "isActive": false
  }'

# حذف مستخدم
curl -X DELETE http://localhost:5000/api/users/USER_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## اختبار API

للاختبار السريع لجميع endpoints:

```bash
cd backend

# تثبيت axios للاختبار (إذا لم يكن مثبتاً)
npm install axios

# تشغيل اختبارات API
node test-users-api.js
```

سيقوم script الاختبار بـ:
1. تسجيل الدخول كمدير
2. جلب قائمة المستخدمين
3. إنشاء مستخدم تجريبي
4. جلب بيانات المستخدم الواحد
5. تحديث بيانات المستخدم
6. تبديل حالة المستخدم
7. حذف المستخدم التجريبي

## Frontend Integration

### مكونات React
```jsx
// استخدام API في React
import { usersAPI } from '../utils/apiHelpers';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getAll();
        setUsers(response.data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user._id}>
          <h3>{user.fullName}</h3>
          <p>اسم المستخدم: {user.username}</p>
          <p>الدور: {user.role}</p>
          <p>الحالة: {user.isActive ? 'نشط' : 'غير نشط'}</p>
        </div>
      ))}
    </div>
  );
};
```

## ملاحظات أمنية

1. **مصادقة المدير**: جميع العمليات تتطلب صلاحية المدير
2. **حماية الحساب الخاص**: لا يمكن للمدير حذف أو إلغاء تفعيل حسابه الخاص
3. **تشفير كلمة المرور**: كلمات المرور مشفرة تلقائياً عند الإنشاء
4. **التحقق من البيانات**: جميع البيانات تخضع للتحقق قبل المعالجة
5. **رسائل خطأ آمنة**: لا تكشف معلومات حساسة في رسائل الخطأ

---
**آخر تحديث**: تم إضافة نظام إدارة المستخدمين الكامل مع جميع العمليات CRUD 