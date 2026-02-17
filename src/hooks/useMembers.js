import { useState, useEffect } from "react";
import {
  subscribeToMembers,
  addMember as addMemberService,
  updateMember as updateMemberService,
  removeMember as removeMemberService,
  clearAllMembers as clearService,
  importMembersFromCSV as importService,
} from "../services/memberService";

export function useMembers(user) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToMembers(
      (data) => {
        setMembers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load members:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const addMember = async (memberData) => {
    return addMemberService(memberData);
  };

  const updateMember = async (memberId, updates) => {
    return updateMemberService(memberId, updates);
  };

  const removeMember = async (memberId) => {
    return removeMemberService(memberId);
  };

  const clearRoster = async () => {
    return clearService(members);
  };

  const importFromCSV = async (parsedRows) => {
    return importService(parsedRows);
  };

  return { members, loading, addMember, updateMember, removeMember, clearRoster, importFromCSV };
}
