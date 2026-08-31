import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Volunteer } from '@/types/database';
import { Search, Plus, Eye, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function VolunteersOverview() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ['volunteers'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_VOLUNTEERS as Volunteer[];
      const { data, error } = await supabase.from('volunteers').select('*').order('volunteer_code');
      if (error) throw error;
      return data as Volunteer[];
    },
  });

  const filteredVolunteers = volunteers.filter((person) => {
    const matchesSearch =
      person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.volunteer_code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = volunteers.length;
  const active = volunteers.filter((v) => v.status === 'Active').length;

  const StatusBadge = ({ status }: { status: string | null }) => {
    const colors: Record<string, string> = {
      Active: 'bg-green-100 text-green-700',
      Inactive: 'bg-red-100 text-red-700',
    };
    const colorClass = status && colors[status] ? colors[status] : 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Volunteers</h2>
        <Button asChild>
          <Link to="/volunteers/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Volunteer
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Total Volunteers</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{active}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{total - active}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-white flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or volunteer code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-50/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto ml-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Volunteer Code</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">School / Class</th>
                <th className="px-6 py-3 font-medium">Mobile</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading volunteers...</td>
                </tr>
              ) : filteredVolunteers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No volunteers found matching your filters.</td>
                </tr>
              ) : (
                filteredVolunteers.map((person) => (
                  <tr key={person.id} className="border-b border-border hover:bg-gray-50/50 transition-colors last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground">{person.volunteer_code}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{person.full_name}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {person.organization || '-'}{person.school_class ? ` • ${person.school_class}` : ''}
                    </td>
                    <td className="px-6 py-4">{person.mobile || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={person.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => navigate(`/volunteers/${person.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const MOCK_VOLUNTEERS: Partial<Volunteer>[] = [
  { id: '1', volunteer_code: 'SITVL2601', full_name: 'Krishna Rana', organization: 'Kendriya Vidyalaya School', school_class: '5th', mobile: '89496 85726', status: 'Active' },
  { id: '2', volunteer_code: 'SITVL2602', full_name: 'Muskan Rana', organization: 'Govt Girls Secondary School', school_class: '7th', mobile: '96539 16107', status: 'Active' },
];
