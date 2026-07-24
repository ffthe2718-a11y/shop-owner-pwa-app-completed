export const shopInfo = {
  name: "Royal Glow Salon",
  status: "Open Now",
  owner: {
    name: "Rajesh",
    avatar: "https://i.pravatar.cc/150?u=rajesh"
  }
};

export const kpiData = {
  todayBookings: 18,
  todayRevenue: "₹12,450",
  customers: "1,284",
  pendingRequests: 4,
  rating: "4.8",
  wallet: "₹18,750"
};

export const scheduleData = [
  { id: 1, customer: "Anita Sharma", service: "Bridal Makeup", staff: "Meera", time: "10:00 AM", status: "In Progress", amount: "₹3,500", avatar: "https://i.pravatar.cc/150?u=1" },
  { id: 2, customer: "Vikram Singh", service: "Haircut & Beard", staff: "Rahul", time: "11:30 AM", status: "Pending", amount: "₹450", avatar: "https://i.pravatar.cc/150?u=2" },
  { id: 3, customer: "Priya Patel", service: "Hair Spa", staff: "Sneha", time: "01:00 PM", status: "Confirmed", amount: "₹1,200", avatar: "https://i.pravatar.cc/150?u=3" },
  { id: 4, customer: "Rohan Das", service: "Facial", staff: "Amit", time: "03:00 PM", status: "Completed", amount: "₹800", avatar: "https://i.pravatar.cc/150?u=4" },
];

export const servicesData = [
  { id: 1, name: "Haircut", category: "Hair", duration: "30 Min", price: "₹300", active: true },
  { id: 2, name: "Beard Styling", category: "Hair", duration: "20 Min", price: "₹200", active: true },
  { id: 3, name: "Bridal Makeup", category: "Makeup", duration: "120 Min", price: "₹4500", discount: "₹3500", active: true },
  { id: 4, name: "Hair Spa", category: "Spa", duration: "60 Min", price: "₹1500", discount: "₹1200", active: true },
  { id: 5, name: "Manicure", category: "Nail", duration: "45 Min", price: "₹500", active: false },
];

export const staffData = [
  { id: 1, name: "Meera", role: "Senior Stylist", rating: "4.9", bookings: 5, status: "Available", avatar: "https://i.pravatar.cc/150?u=s1" },
  { id: 2, name: "Rahul", role: "Barber", rating: "4.7", bookings: 8, status: "Busy", avatar: "https://i.pravatar.cc/150?u=s2" },
  { id: 3, name: "Sneha", role: "Makeup Artist", rating: "4.8", bookings: 3, status: "On Leave", avatar: "https://i.pravatar.cc/150?u=s3" },
];

export const reviewsData = [
  { id: 1, customer: "Anita Sharma", rating: 5, text: "Amazing service! Loved the makeup.", service: "Bridal Makeup", date: "Today", status: "Pending" },
  { id: 2, customer: "Rohan Das", rating: 4, text: "Good facial but took a bit long.", service: "Facial", date: "Yesterday", status: "Resolved", reply: "Thank you for the feedback, Rohan. We'll work on our timing!" },
];

export const customersData = [
  { id: "1", name: "Anita Sharma", mobile: "+91 9876543210", email: "anita.sharma@gmail.com", visits: 12, spent: "₹25,000", lastVisit: "Today", status: "VIP", avatar: "https://i.pravatar.cc/150?u=1" },
  { id: "2", name: "Vikram Singh", mobile: "+91 8765432109", email: "vikram.singh@yahoo.com", visits: 3, spent: "₹1,350", lastVisit: "2 days ago", status: "Regular", avatar: "https://i.pravatar.cc/150?u=2" },
  { id: "3", name: "Priya Patel", mobile: "+91 9123456789", email: "priya.patel@hotmail.com", visits: 7, spent: "₹8,400", lastVisit: "5 days ago", status: "VIP", avatar: "https://i.pravatar.cc/150?u=3" },
  { id: "4", name: "Rohan Das", mobile: "+91 9988776655", email: "rohan.das@gmail.com", visits: 1, spent: "₹450", lastVisit: "1 week ago", status: "New", avatar: "https://i.pravatar.cc/150?u=4" },
  { id: "5", name: "Meenakshi Sundaram", mobile: "+91 9811223344", email: "meena.s@gmail.com", visits: 15, spent: "₹32,100", lastVisit: "Yesterday", status: "VIP", avatar: "https://i.pravatar.cc/150?u=5" },
  { id: "6", name: "Karan Johar", mobile: "+91 9776655443", email: "karan.j@gmail.com", visits: 4, spent: "₹4,200", lastVisit: "3 weeks ago", status: "Regular", avatar: "https://i.pravatar.cc/150?u=6" },
  { id: "7", name: "Neha Gupta", mobile: "+91 9554433221", email: "neha.gupta@outlook.com", visits: 2, spent: "₹1,800", lastVisit: "1 month ago", status: "Regular", avatar: "https://i.pravatar.cc/150?u=7" }
];

export const transactionsData = [
  { id: "TXN102", type: "Credit", amount: "₹3,500", date: "Today, 11:00 AM", status: "Success", ref: "Booking #1" },
  { id: "TXN101", type: "Payout", amount: "₹15,000", date: "Yesterday", status: "Success", ref: "Bank Settlement" },
  { id: "TXN100", type: "Commission", amount: "₹-150", date: "Yesterday", status: "Success", ref: "Platform Fee" }
];

export const payoutsData = [
  { id: "PO402", date: "Jul 21, 2026", gross: "₹20,000", commission: "₹1,000", net: "₹19,000", status: "Processing" },
  { id: "PO401", date: "Jul 14, 2026", gross: "₹18,000", commission: "₹900", net: "₹17,100", status: "Paid" }
];

export const templatesData = [
  { id: 1, name: "Royal Luxe", style: "Elegant & Premium", selected: true, img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80" },
  { id: 2, name: "Modern Salon", style: "Minimal & Clean", selected: false, img: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=400&q=80" },
  { id: 3, name: "Professional Beauty", style: "Bright & Fresh", selected: false, img: "https://images.unsplash.com/photo-1516975080661-460d3d578eb7?auto=format&fit=crop&w=400&q=80" }
];
