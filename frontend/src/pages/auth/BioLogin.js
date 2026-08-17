import React from 'react';
import { Navigate } from 'react-router-dom';
// Bio auth uses main login/register
export default function BioLogin() { return <Navigate to="/login" replace />; }
