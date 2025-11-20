import React, { useEffect, useState } from "react";
import { 
  Users, 
  DollarSign, 
  Activity, 
  BarChart3, 
  BookOpen, 
  TrendingUp, 
  TrendingDown,
  Award,
  Clock,
  MessageSquare,
  ShoppingCart,
  Eye,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    revenue: 0,
    courses: 0,
    completionRate: 0,
    averageScore: 0
  });
  const [userActivity, setUserActivity] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  useEffect(() => {
  async function fetchAdminDashboard() {
    setLoading(true);
    setError("");

    try {
      const authHeader = localStorage.getItem("authHeader");
      if (!authHeader) throw new Error("Admin authentication required");

      const response = await fetch("/dashboard/admin", {
        headers: { Authorization: authHeader }
      });

      if (!response.ok) throw new Error("Failed to fetch admin dashboard");
      const data = await response.json();

      // State comes straight from backend summary
      setStats(data.stats);
      setTopPerformers(data.topPerformers);
      setRecentTransactions(data.recentOrders);
      setSystemAlerts(data.systemAlerts);

    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  fetchAdminDashboard();
}, [selectedTimeRange]);


  const processStats = (users, courses, transactions, orders, reviews) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const activeUsers = users.filter(user => {
      const userDate = user.joined_date ? new Date(user.joined_date) : sevenDaysAgo;
      return userDate >= sevenDaysAgo;
    }).length;

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0) +
                        orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const completionRate = orders.length > 0 ? 
      Math.round((orders.filter(o => o.status === 'Completed').length / orders.length) * 100) : 0;

    const averageScore = reviews.length > 0 ? 
      Math.round(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) : 0;

    return {
      totalUsers: users.length,
      activeUsers,
      revenue: totalRevenue,
      courses: courses.length,
      completionRate,
      averageScore
    };
  };

  const processUserActivity = (users, orders) => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        users: 0,
        orders: 0
      };
    }).reverse();

    // Count user registrations and orders by day
    users.forEach(user => {
      if (user.joined_date) {
        const dayData = last7Days.find(d => d.date === user.joined_date);
        if (dayData) dayData.users++;
      }
    });

    orders.forEach(order => {
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        const dayData = last7Days.find(d => d.date === orderDate);
        if (dayData) dayData.orders++;
      }
    });

    return last7Days;
  };

  const processCourseStats = (courses, orders, reviews) => {
    return courses.slice(0, 5).map(course => {
      const courseOrders = orders.filter(o => 
        o.items && o.items.some(item => item.title === course.title || item.title === course.course_name)
      );
      const courseReviews = reviews.filter(r => r.course_id === course.course_id);
      const avgRating = courseReviews.length > 0 ? 
        courseReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / courseReviews.length : 0;

      return {
        name: course.title || course.course_name || 'Untitled Course',
        enrollments: courseOrders.length,
        rating: avgRating.toFixed(1),
        completion: Math.floor(Math.random() * 100), // Mock data
        revenue: courseOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      };
    });
  };

  const processRevenueData = (transactions, orders) => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        amount: 0
      };
    }).reverse();

    transactions.forEach(transaction => {
      if (transaction.created_at) {
        const transDate = new Date(transaction.created_at).toISOString().split('T')[0];
        const dayData = last7Days.find(d => d.date === transDate);
        if (dayData) dayData.amount += transaction.amount || 0;
      }
    });

    orders.forEach(order => {
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        const dayData = last7Days.find(d => d.date === orderDate);
        if (dayData) dayData.amount += order.totalAmount || 0;
      }
    });

    return last7Days;
  };

  const processRecentTransactions = (transactions, orders) => {
    const allTransactions = [
      ...transactions.map(t => ({
        id: t.payment_id || t._id,
        type: 'payment',
        user: t.email,
        amount: t.amount,
        status: t.status,
        date: t.created_at || new Date().toISOString()
      })),
      ...orders.map(o => ({
        id: o._id,
        type: 'order',
        user: o.userEmail,
        amount: o.totalAmount,
        status: o.status,
        date: o.createdAt || new Date().toISOString()
      }))
    ];

    return allTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  };

  const processTopPerformers = (users, orders) => {
    const userStats = {};
    
    orders.forEach(order => {
      if (!userStats[order.userEmail]) {
        userStats[order.userEmail] = {
          email: order.userEmail,
          orders: 0,
          totalSpent: 0,
          courses: 0
        };
      }
      userStats[order.userEmail].orders++;
      userStats[order.userEmail].totalSpent += order.totalAmount || 0;
      userStats[order.userEmail].courses += order.items ? order.items.length : 1;
    });

    return Object.values(userStats)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  };

  const generateSystemAlerts = (users, courses, transactions) => {
    const alerts = [];
    
    // Check for recent user growth
    const recentUsers = users.filter(user => {
      if (!user.joined_date) return false;
      const joinDate = new Date(user.joined_date);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return joinDate >= yesterday;
    });

    if (recentUsers.length > 5) {
      alerts.push({
        type: 'success',
        icon: TrendingUp,
        title: 'User Growth Spike',
        message: `${recentUsers.length} new users joined in the last 24 hours`
      });
    }

    // Check for failed transactions
    const failedTransactions = transactions.filter(t => t.status === 'failed');
    if (failedTransactions.length > 0) {
      alerts.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Payment Issues',
        message: `${failedTransactions.length} failed transactions need attention`
      });
    }

    // Check course performance
    if (courses.length > 10) {
      alerts.push({
        type: 'info',
        icon: BookOpen,
        title: 'Course Catalog Growing',
        message: `${courses.length} courses now available on the platform`
      });
    }

    return alerts;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg text-gray-600">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Monitor and manage your learning platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="text-xs text-green-600 mt-1">+{stats.activeUsers} this week</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue)}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-xs text-green-600 mt-1">+12.5% vs last month</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.courses}</div>
            <div className="text-sm text-gray-600">Active Courses</div>
            <div className="text-xs text-purple-600 mt-1">3 new this week</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="text-xs text-green-600 mt-1">+5% improvement</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Award className="w-6 h-6 text-red-600" />
              </div>
              <Activity className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.averageScore}/5</div>
            <div className="text-sm text-gray-600">Average Rating</div>
            <div className="text-xs text-red-600 mt-1">Based on reviews</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600">Active Users</div>
            <div className="text-xs text-green-600 mt-1">Last 7 days</div>
          </div>
        </div>

        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => {
                const IconComponent = alert.icon;
                return (
                  <div key={index} className={`p-4 rounded-lg border ${getAlertColor(alert.type)} flex items-center space-x-3`}>
                    <IconComponent className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">{alert.title}</div>
                      <div className="text-sm">{alert.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Charts and Analytics */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="col-span-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trends</h3>
            <div className="h-64 flex items-end space-x-4 px-4">
              {revenueData.map((day, index) => {
                const maxAmount = Math.max(...revenueData.map(d => d.amount));
                const height = maxAmount > 0 ? (day.amount / maxAmount) * 200 : 20;
                return (
                  <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                    <div className="text-xs text-gray-600 font-medium">
                      {formatCurrency(day.amount)}
                    </div>
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500 hover:from-blue-700 hover:to-blue-500"
                      style={{ height: `${height}px`, minHeight: '20px' }}
                    ></div>
                    <div className="text-sm text-gray-600 font-medium">{day.day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Activity */}
          <div className="col-span-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">User Activity</h3>
            <div className="space-y-4">
              {userActivity.slice(0, 7).map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">{day.day}</div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">{day.users} users</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">{day.orders} orders</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-12 gap-6">
          {/* Course Performance */}
          <div className="col-span-7 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Course Performance</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600 text-sm">Course</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600 text-sm">Enrollments</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600 text-sm">Rating</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600 text-sm">Completion</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 text-sm">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStats.map((course, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="font-medium text-gray-900">{course.name}</div>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="text-gray-700">{course.enrollments}</span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <Award className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="text-gray-700">{course.rating}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="text-gray-700">{course.completion}%</span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className="font-medium text-gray-900">{formatCurrency(course.revenue)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="col-span-5 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
            </div>
            <div className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${transaction.type === 'payment' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      {transaction.type === 'payment' ? 
                        <DollarSign className="w-4 h-4 text-green-600" /> : 
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {transaction.user}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Students</h3>
            <div className="grid grid-cols-5 gap-4">
              {topPerformers.map((performer, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-lg mx-auto mb-3">
                    {performer.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-medium text-gray-900 text-sm mb-1">
                    {performer.email.split('@')[0]}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {performer.courses} courses • {performer.orders} orders
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(performer.totalSpent)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;