import React, { useState, useEffect } from 'react';
import { X, Save, Upload, FileText, Search } from 'lucide-react';
import { LifecycleAction, UserDetails } from '../../types';
import { userDetailsService, assetsService, assetPairsService } from '../../lib/supabase';

interface LifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: Partial<LifecycleAction>, movementForm?: File) => void;
  actionType: string;
}

const LifecycleModal: React.FC<LifecycleModalProps> = ({ isOpen, onClose, onSave, actionType }) => {
  const [formData, setFormData] = useState<Partial<LifecycleAction>>({
    actionType: actionType as LifecycleAction['actionType'],
    primaryAssetSerial: '',
    secondaryAssetSerial: '',
    assetPairType: 'PC',
    toUserFullName: '',
    toUserDomainAccount: '',
    toLocation: '',
    toDepartment: '',
    toSection: '',
    requestedBy: 'ICT Officer',
    status: 'Pending'
  });
  
  const [movementForm, setMovementForm] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<UserDetails[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [assetDetails, setAssetDetails] = useState<any>(null);
  const [currentOwnerDetails, setCurrentOwnerDetails] = useState<any>(null);

  // Update form data when actionType prop changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      actionType: actionType as LifecycleAction['actionType']
    }));
    
    // Set default from details for new deployment and redeployment
    if (actionType === 'New Deployment' || actionType === 'Redeployment') {
      setFormData(prev => ({
        ...prev,
        fromUserFullName: 'ICT Manager',
        fromUserDomainAccount: 'ICT001',
        fromLocation: 'ICT Store',
        fromDepartment: 'ICT',
        fromSection: 'Asset Management'
      }));
    }
  }, [actionType]);

  // Search for assets when serial numbers are entered
  useEffect(() => {
    if (formData.primaryAssetSerial && (actionType === 'Relocation' || actionType === 'Surrender' || actionType === 'Change of Ownership')) {
      fetchAssetDetails();
    }
  }, [formData.primaryAssetSerial, actionType]);

  const fetchAssetDetails = async () => {
    if (!formData.primaryAssetSerial) return;
    
    try {
      setLoading(true);
      
      // Get asset pair details
      const assetPair = await assetPairsService.getByAssetSerial(formData.primaryAssetSerial);
      
      if (assetPair && assetPair.isDeployed) {
        setAssetDetails(assetPair);
        setCurrentOwnerDetails({
          fullName: assetPair.currentUser,
          location: assetPair.currentLocation,
          department: assetPair.currentDepartment,
          section: assetPair.currentSection
        });
        
        // Auto-populate from fields for relocation and change of ownership
        if (actionType === 'Relocation' || actionType === 'Change of Ownership') {
          setFormData(prev => ({
            ...prev,
            fromUserFullName: assetPair.currentUser,
            fromLocation: assetPair.currentLocation,
            fromDepartment: assetPair.currentDepartment,
            fromSection: assetPair.currentSection,
            assetPairType: assetPair.pairType
          }));
        }
        
        // Auto-populate to fields for surrender
        if (actionType === 'Surrender') {
          setFormData(prev => ({
            ...prev,
            fromUserFullName: assetPair.currentUser,
            fromLocation: assetPair.currentLocation,
            fromDepartment: assetPair.currentDepartment,
            fromSection: assetPair.currentSection,
            toUserFullName: 'ICT Manager',
            toUserDomainAccount: 'T00000000',
            toLocation: 'ICT Store',
            toDepartment: 'ICT',
            toSection: 'Asset Management',
            assetPairType: assetPair.pairType
          }));
        }
      } else {
        setError('Asset not found or not currently deployed');
      }
    } catch (err) {
      console.error('Error fetching asset details:', err);
      setError('Failed to fetch asset details');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setUserSearchResults([]);
      return;
    }
    
    try {
      // This would be implemented in your userDetailsService
      // For now, we'll use a mock search
      const results: UserDetails[] = []; // await userDetailsService.search(searchTerm);
      setUserSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const selectUser = (user: UserDetails) => {
    setFormData(prev => ({
      ...prev,
      toUserFullName: user.fullName,
      toUserDomainAccount: user.domainAccount,
      toLocation: user.location,
      toDepartment: user.department,
      toSection: user.section
    }));
    setShowUserSearch(false);
    setUserSearchResults([]);
  };

  // Check if asset type supports individual deployment
  const isIndividualAsset = (assetType: string) => {
    return ['Laptop', 'IP Phone', 'Printer', 'Router', 'Switch'].includes(assetType);
  };

  const isPairAsset = (assetType: string) => {
    return ['CPU', 'Monitor', 'VDI Receiver'].includes(assetType);
  };

  const validateAssetPair = async () => {
    // For individual assets, only primary asset is required
    if (formData.deploymentType === 'Individual') {
      if (!formData.primaryAssetSerial) {
        setError('Asset serial number is required');
        return false;
      }
    } else {
      // For pairs, both assets are required
      if (!formData.primaryAssetSerial || !formData.secondaryAssetSerial) {
        setError('Both primary and secondary asset serial numbers are required');
        return false;
      }
    }

    try {
      // Check if assets exist
      const primaryAsset = await assetsService.getBySerial(formData.primaryAssetSerial);
      if (!primaryAsset) {
        setError('Primary asset not found in the system');
        return false;
      }

      // Check if primary asset is available for deployment
      if (primaryAsset.status === 'Active') {
        setError(`Primary asset ${formData.primaryAssetSerial} is already in use and cannot be deployed`);
        return false;
      }

      // For individual assets, validate the asset type
      if (formData.deploymentType === 'Individual') {
        if (!isIndividualAsset(primaryAsset.assetType)) {
          setError(`${primaryAsset.assetType} assets must be deployed as pairs, not individually`);
          return false;
        }
        return true;
      }

      // For pairs, check secondary asset
      const secondaryAsset = await assetsService.getBySerial(formData.secondaryAssetSerial);
      
      if (!secondaryAsset) {
        setError('Secondary asset not found in the system');
        return false;
      }

      // Check if secondary asset is available for deployment
      if (secondaryAsset.status === 'Active') {
        setError(`Secondary asset ${formData.secondaryAssetSerial} is already in use and cannot be deployed`);
        return false;
      }

      // Validate asset types for pairing
      if (formData.assetPairType === 'PC') {
        const validPCPair = (
          (primaryAsset.assetType === 'CPU' && secondaryAsset.assetType === 'Monitor') ||
          (primaryAsset.assetType === 'Monitor' && secondaryAsset.assetType === 'CPU')
        );
        if (!validPCPair) {
          setError('PC pairs must consist of a CPU and Monitor');
          return false;
        }
      } else if (formData.assetPairType === 'VDI') {
        const validVDIPair = (
          (primaryAsset.assetType === 'VDI' && secondaryAsset.assetType === 'Monitor') ||
          (primaryAsset.assetType === 'Monitor' && secondaryAsset.assetType === 'VDI Receiver')
        );
        if (!validVDIPair) {
          setError('VDI pairs must consist of a VDI Receiver and Monitor');
          return false;
        }
      }

      // Check if assets are already deployed (for new deployment)
      if (actionType === 'New Deployment') {
        const existingPair = await assetPairsService.getByAssetSerial(formData.primaryAssetSerial);
        if (existingPair && existingPair.isDeployed) {
          setError('Asset is already deployed and cannot be deployed again');
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error validating asset pair:', err);
      setError('Failed to validate asset pair');
      return false;
    }
  };

  const validateDomainAccount = (account: string): boolean => {
    const pattern = /^[KT]\d{8}$/;
    return pattern.test(account.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate domain account format
    if (formData.toUserDomainAccount && !validateDomainAccount(formData.toUserDomainAccount)) {
      setError('Domain account must be in format K12345678 or T12345678');
      return;
    }

    // Validate asset pair for deployment actions
    if (['New Deployment', 'Redeployment'].includes(actionType)) {
      const isValid = await validateAssetPair();
      if (!isValid) return;
    }

    // Prepare form data based on deployment type
    const finalFormData = {
      ...formData,
      actionType: actionType as LifecycleAction['actionType'],
      requestDate: new Date().toISOString(),
      toUserDomainAccount: formData.toUserDomainAccount?.toUpperCase(),
      // For individual assets, clear secondary asset serial and set deployment type
      ...(formData.deploymentType === 'Individual' && {
        secondaryAssetSerial: '', // Clear secondary asset for individual deployment
        assetPairType: undefined, // Clear pair type for individual assets
      })
    };
    
    onSave(finalFormData, movementForm || undefined);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      actionType: actionType as LifecycleAction['actionType'],
      primaryAssetSerial: '',
      secondaryAssetSerial: '',
      assetPairType: 'PC',
      toUserFullName: '',
      toUserDomainAccount: '',
      toLocation: '',
      toDepartment: '',
      toSection: '',
      requestedBy: 'ICT Officer',
      status: 'Pending'
    });
    setMovementForm(null);
    setError(null);
    setAssetDetails(null);
    setCurrentOwnerDetails(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setMovementForm(file);
    } else {
      alert('Please select a PDF file');
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  const isDeploymentAction = ['New Deployment', 'Redeployment'].includes(actionType);
  const isRelocationAction = actionType === 'Relocation';
  const isSurrenderAction = actionType === 'Surrender';
  const isChangeOwnershipAction = actionType === 'Change of Ownership';
  const requiresFromFields = ['Relocation', 'Change of Ownership', 'Surrender'].includes(actionType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">{actionType} Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deployment Type Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Type</label>
              <select
                name="deploymentType"
                value={formData.deploymentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                <option value="Pair">Asset Pair (PC/VDI)</option>
                <option value="Individual">Individual Asset (Laptop, Phone, Printer, etc.)</option>
              </select>
            </div>

            {/* Asset Type Selection - Show appropriate options based on deployment type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.deploymentType === 'Pair' ? 'Asset Pair Type' : 'Asset Type'}
              </label>
              <select
                name={formData.deploymentType === 'Pair' ? 'assetPairType' : 'individualAssetType'}
                value={formData.deploymentType === 'Pair' ? formData.assetPairType : formData.individualAssetType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                {formData.deploymentType === 'Pair' ? (
                  <>
                    <option value="PC">PC (CPU + Monitor)</option>
                    <option value="VDI">VDI (VDI Receiver + Monitor)</option>
                  </>
                ) : (
                  <>
                    <option value="">Select Asset Type</option>
                    <option value="Laptop">Laptop</option>
                    <option value="IP Phone">IP Phone</option>
                    <option value="Printer">Printer</option>
                    <option value="Router">Router</option>
                    <option value="Switch">Switch</option>
                  </>
                )}
              </select>
            </div>

            {/* Asset Serial Numbers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.deploymentType === 'Individual' 
                  ? `${formData.individualAssetType || 'Asset'} Serial Number`
                  : formData.assetPairType === 'PC' 
                    ? 'CPU Serial Number' 
                    : 'VDI Receiver Serial Number'
                }
              </label>
              <input
                type="text"
                name="primaryAssetSerial"
                value={formData.primaryAssetSerial}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder={formData.deploymentType === 'Individual' 
                  ? "Enter asset serial number"
                  : "Enter primary asset serial number"
                }
              />
            </div>

            {/* Secondary Asset - Only for pairs */}
            {formData.deploymentType === 'Pair' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monitor Serial Number</label>
                <input
                  type="text"
                  name="secondaryAssetSerial"
                  value={formData.secondaryAssetSerial}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                  required={formData.deploymentType === 'Pair'}
                  placeholder="Enter monitor serial number"
                />
              </div>
            )}

            {/* Current Owner Details (for relocation, surrender, change of ownership) */}
            {requiresFromFields && currentOwnerDetails && (
              <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Current Asset Owner</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {currentOwnerDetails.fullName}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {currentOwnerDetails.location}
                  </div>
                  <div>
                    <span className="font-medium">Department:</span> {currentOwnerDetails.department}
                  </div>
                  <div>
                    <span className="font-medium">Section:</span> {currentOwnerDetails.section}
                  </div>
                </div>
              </div>
            )}

            {/* To User Details (not for surrender) */}
            {!isSurrenderAction && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isDeploymentAction ? 'Deploy to User' : 'New User Full Name'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="toUserFullName"
                      value={formData.toUserFullName}
                      onChange={handleChange}
                      onFocus={() => setShowUserSearch(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                      required
                      placeholder="Enter full name"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {showUserSearch && userSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => selectUser(user)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-gray-600">{user.domainAccount} - {user.department}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domain Account</label>
                  <input
                    type="text"
                    name="toUserDomainAccount"
                    value={formData.toUserDomainAccount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                    required
                    placeholder="K12345678 or T12345678"
                    maxLength={9}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    name="toLocation"
                    value={formData.toLocation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                    required
                    placeholder="Deployment location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    name="toDepartment"
                    value={formData.toDepartment}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="ICT">ICT</option>
                    <option value="Customs">Customs</option>
                    <option value="Domestic Taxes">Domestic Taxes</option>
                    <option value="Investigation & Enforcement">Investigation & Enforcement</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal">Legal</option>
                    <option value="Audit">Audit</option>
                    <option value="Strategy & Planning">Strategy & Planning</option>
                    <option value="Commissioner General">Commissioner General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <input
                    type="text"
                    name="toSection"
                    value={formData.toSection}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                    required
                    placeholder="Section within department"
                  />
                </div>
              </>
            )}

            {/* Movement Form Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Movement Form (PDF)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="movement-form" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload Asset Movement Form
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PDF files only, max 10MB
                      </span>
                    </label>
                    <input
                      id="movement-form"
                      name="movement-form"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="sr-only"
                      required
                    />
                  </div>
                </div>
                {movementForm && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{movementForm.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#CC092F] text-white rounded-lg hover:bg-[#AA0726] flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LifecycleModal;