// "use client";
// import React, { useEffect, useState } from "react";
// import { useAuth } from "@/contexts/AuthContext";
// import { doc, getDoc } from "firebase/firestore";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

// const CheckAdminStatus = () => {
//   const { currentUser } = useAuth();
//   const [status, setStatus] = useState<
//     "checking" | "admin" | "not-admin" | "error"
//   >("checking");
//   const [details, setDetails] = useState<string>("");

//   const checkStatus = async () => {
//     setStatus("checking");

//     if (!currentUser) {
//       setStatus("not-admin");
//       setDetails("No user is currently logged in");
//       return;
//     }

//     try {
//       console.log(`Checking admin status for user: ${currentUser.uid}`);
//       const userDocRef = doc(db, "admin", currentUser.uid);
//       const userDoc = await getDoc(userDocRef);

//       const docData = userDoc.exists() ? userDoc.data() : null;

//       if (userDoc.exists() && docData?.role === "admin") {
//         setStatus("admin");
//         setDetails(`Admin document found. Role: ${docData?.role}`);
//       } else {
//         setStatus("not-admin");
//         setDetails(
//           userDoc.exists()
//             ? `Document exists but role is "${docData?.role}" instead of "admin"`
//             : "No admin document found for this user ID"
//         );
//       }
//     } catch (error: any) {
//       setStatus("error");
//       setDetails(`Error: ${error.message}`);
//       console.error("Error checking admin status:", error);
//     }
//   };

//   useEffect(() => {
//     if (currentUser) {
//       checkStatus();
//     } else {
//       setStatus("not-admin");
//       setDetails("Please log in first");
//     }
//   }, [currentUser]);

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-3xl font-bold">Admin Status Checker</h1>
//         <p className="text-gray-500 mt-1">Diagnose admin permission issues</p>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Admin Permission Status</CardTitle>
//           <CardDescription>
//             User ID: {currentUser ? currentUser.uid : "Not logged in"}
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {status === "checking" ? (
//             <Alert>
//               <AlertCircle className="h-5 w-5" />
//               <AlertTitle>Checking permissions...</AlertTitle>
//               <AlertDescription>
//                 Please wait while we verify your admin status
//               </AlertDescription>
//             </Alert>
//           ) : status === "admin" ? (
//             <Alert className="bg-green-50 border-green-200">
//               <CheckCircle className="h-5 w-5 text-green-600" />
//               <AlertTitle className="text-green-800">
//                 Admin Access Confirmed
//               </AlertTitle>
//               <AlertDescription className="text-green-700">
//                 {details}
//               </AlertDescription>
//             </Alert>
//           ) : status === "not-admin" ? (
//             <Alert className="bg-yellow-50 border-yellow-200">
//               <XCircle className="h-5 w-5 text-yellow-600" />
//               <AlertTitle className="text-yellow-800">Not an Admin</AlertTitle>
//               <AlertDescription className="text-yellow-700">
//                 {details}
//               </AlertDescription>
//             </Alert>
//           ) : (
//             <Alert className="bg-red-50 border-red-200">
//               <AlertCircle className="h-5 w-5 text-red-600" />
//               <AlertTitle className="text-red-800">
//                 Error Checking Admin Status
//               </AlertTitle>
//               <AlertDescription className="text-red-700">
//                 {details}
//               </AlertDescription>
//             </Alert>
//           )}

//           <div className="pt-4">
//             <Button onClick={checkStatus}>Refresh Status</Button>
//           </div>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader>
//           <CardTitle>Troubleshooting Guide</CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="space-y-2">
//             <h3 className="font-medium">Check these common issues:</h3>
//             <ul className="list-disc pl-5 space-y-1">
//               <li>
//                 The document ID in the "admin" collection must exactly match
//                 your Firebase user ID
//               </li>
//               <li>The "role" field must be exactly "admin" (case sensitive)</li>
//               <li>You must be logged in with the correct account</li>
//               <li>
//                 The "admin" collection (not "admins") must exist in Firebase
//               </li>
//             </ul>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default CheckAdminStatus;

import React from "react";

function CheckAdminStatus() {
  return <div>CheckAdminStatus</div>;
}

export default CheckAdminStatus;
