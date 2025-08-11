import React from 'react';

interface DataSource {
  semrushRequested: boolean;
  semrushSuccessful: boolean;
  semrushKeywords: number;
  aiKeywords: number;
  googleKeywords: number;
  totalSources: string[];
  dataQuality: 'enhanced' | 'standard';
}

interface DataSourceIndicatorProps {
  dataSource?: DataSource;
  sources?: string[];
  compact?: boolean;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({ 
  dataSource,
  sources, 
  compact = false 
}) => {
  // Handle simple sources array (backward compatibility)
  if (sources && !dataSource) {
    const simpleDataSource: DataSource = {
      semrushRequested: sources.includes('semrush'),
      semrushSuccessful: sources.includes('semrush'),
      semrushKeywords: sources.includes('semrush') ? 1 : 0,
      aiKeywords: sources.includes('ai') ? 1 : 0,
      googleKeywords: sources.includes('google') ? 1 : 0,
      totalSources: sources,
      dataQuality: sources.includes('semrush') ? 'enhanced' : 'standard'
    };
    return <DataSourceIndicator dataSource={simpleDataSource} compact={compact} />;
  }
  
  if (!dataSource) {
    return null;
  }
  const getStatusBadge = (source: string, isActive: boolean, count?: number) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    const activeClasses = isActive 
      ? "bg-green-100 text-green-800" 
      : "bg-gray-100 text-gray-500";
    
    return (
      <span className={`${baseClasses} ${activeClasses}`}>
        {source}
        {count !== undefined && count > 0 && (
          <span className="ml-1 text-xs">({count})</span>
        )}
      </span>
    );
  };

  const getQualityIndicator = () => {
    const isEnhanced = dataSource.dataQuality === 'enhanced';
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
        isEnhanced 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        {isEnhanced ? '✨ Enhanced Data' : '🔄 Standard Data'}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {getStatusBadge('AI', true, dataSource.aiKeywords)}
          {getStatusBadge('Google', dataSource.googleKeywords > 0, dataSource.googleKeywords)}
          {dataSource.semrushRequested && getStatusBadge(
            'SEMrush', 
            dataSource.semrushSuccessful, 
            dataSource.semrushKeywords
          )}
        </div>
        {getQualityIndicator()}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Data Sources</h4>
        {getQualityIndicator()}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* AI Source */}
        <div className="flex items-center space-x-2 p-2 bg-white rounded border">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">AI Analysis</div>
            <div className="text-xs text-gray-500">{dataSource.aiKeywords} keywords</div>
          </div>
        </div>

        {/* Google Source */}
        <div className="flex items-center space-x-2 p-2 bg-white rounded border">
          <div className={`w-2 h-2 rounded-full ${
            dataSource.googleKeywords > 0 ? 'bg-green-400' : 'bg-gray-300'
          }`}></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Google Suggestions</div>
            <div className="text-xs text-gray-500">{dataSource.googleKeywords} keywords</div>
          </div>
        </div>

        {/* SEMrush Source */}
        <div className="flex items-center space-x-2 p-2 bg-white rounded border">
          <div className={`w-2 h-2 rounded-full ${
            dataSource.semrushSuccessful ? 'bg-green-400' : 
            dataSource.semrushRequested ? 'bg-yellow-400' : 'bg-gray-300'
          }`}></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              SEMrush
              {dataSource.semrushRequested && !dataSource.semrushSuccessful && (
                <span className="ml-1 text-xs text-yellow-600">(Limited)</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {dataSource.semrushRequested ? `${dataSource.semrushKeywords} keywords` : 'Not requested'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-600 pt-2 border-t">
        <strong>Active Sources:</strong> {dataSource.totalSources.join(', ')} • 
        <strong> Quality:</strong> {dataSource.dataQuality === 'enhanced' ? 'Enhanced with professional data' : 'Standard analysis'}
      </div>
    </div>
  );
};

export default DataSourceIndicator;