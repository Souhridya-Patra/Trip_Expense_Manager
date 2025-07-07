import React, { useState, useEffect } from 'react';
import { Plus, Users, Receipt, Calculator, Trash2, Edit3, Check, X, UtensilsCrossed, DollarSign } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  type: 'regular' | 'food';
  foodOrders?: { [person: string]: number };
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

function App() {
  const [totalPeople, setTotalPeople] = useState<number>(0);
  const [payers, setPayers] = useState<string[]>([]);
  const [allPeople, setAllPeople] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', paidBy: '', type: 'regular' as 'regular' | 'food' });
  const [foodOrders, setFoodOrders] = useState<{ [person: string]: string }>({});
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Update all people list when total people changes
  useEffect(() => {
    const newAllPeople = [];
    for (let i = 1; i <= totalPeople; i++) {
      newAllPeople.push(payers[i - 1] || `Person ${i}`);
    }
    setAllPeople(newAllPeople);
    
    // Initialize food orders for new people
    const newFoodOrders = { ...foodOrders };
    newAllPeople.forEach(person => {
      if (!(person in newFoodOrders)) {
        newFoodOrders[person] = '';
      }
    });
    setFoodOrders(newFoodOrders);
  }, [totalPeople, payers]);

  // Add a new payer
  const addPayer = () => {
    if (payers.length < totalPeople) {
      setPayers([...payers, `Person ${payers.length + 1}`]);
    }
  };

  // Update payer name
  const updatePayerName = (index: number, name: string) => {
    const updatedPayers = [...payers];
    const oldName = updatedPayers[index];
    updatedPayers[index] = name;
    setPayers(updatedPayers);
    
    // Update food orders if name changed
    if (oldName !== name && oldName in foodOrders) {
      const newFoodOrders = { ...foodOrders };
      newFoodOrders[name] = newFoodOrders[oldName];
      delete newFoodOrders[oldName];
      setFoodOrders(newFoodOrders);
    }
  };

  // Update food order amount
  const updateFoodOrder = (person: string, amount: string) => {
    setFoodOrders({
      ...foodOrders,
      [person]: amount
    });
  };

  // Add expense
  const addExpense = () => {
    if (newExpense.description && newExpense.amount && newExpense.paidBy) {
      let expense: Expense = {
        id: Date.now().toString(),
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        paidBy: newExpense.paidBy,
        type: newExpense.type
      };

      if (newExpense.type === 'food') {
        const orders: { [person: string]: number } = {};
        let totalOrderAmount = 0;
        
        Object.entries(foodOrders).forEach(([person, amount]) => {
          const orderAmount = parseFloat(amount) || 0;
          if (orderAmount > 0) {
            orders[person] = orderAmount;
            totalOrderAmount += orderAmount;
          }
        });
        
        expense.foodOrders = orders;
        
        // Validate that food orders match the total amount
        if (Math.abs(totalOrderAmount - expense.amount) > 0.01) {
          alert(`Food orders total (${totalOrderAmount.toFixed(2)}) doesn't match the expense amount (${expense.amount.toFixed(2)}). Please adjust the individual orders.`);
          return;
        }
      }

      setExpenses([...expenses, expense]);
      setNewExpense({ description: '', amount: '', paidBy: '', type: 'regular' });
      
      // Clear food orders for next expense
      const clearedOrders: { [person: string]: string } = {};
      allPeople.forEach(person => {
        clearedOrders[person] = '';
      });
      setFoodOrders(clearedOrders);
    }
  };

  // Delete expense
  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  // Update expense
  const updateExpense = (id: string, updatedExpense: Partial<Expense>) => {
    setExpenses(expenses.map(expense => 
      expense.id === id ? { ...expense, ...updatedExpense } : expense
    ));
    setEditingExpense(null);
  };

  // Calculate settlements
  const calculateSettlements = () => {
    // Calculate balances for each person
    const balances: { [key: string]: number } = {};
    
    // Initialize all people with zero balance
    allPeople.forEach(person => {
      balances[person] = 0;
    });
    
    expenses.forEach(expense => {
      if (expense.type === 'food' && expense.foodOrders) {
        // For food expenses, each person pays for their own order
        Object.entries(expense.foodOrders).forEach(([person, amount]) => {
          balances[person] -= amount; // Person owes this amount
        });
        balances[expense.paidBy] += expense.amount; // Payer gets credit for full amount
      } else {
        // For regular expenses, split equally among all people
        const perPersonShare = expense.amount / totalPeople;
        allPeople.forEach(person => {
          balances[person] -= perPersonShare; // Everyone owes their share
        });
        balances[expense.paidBy] += expense.amount; // Payer gets credit for full amount
      }
    });
    
    // Calculate settlements
    const creditors = Object.entries(balances).filter(([_, balance]) => balance > 0.01);
    const debtors = Object.entries(balances).filter(([_, balance]) => balance < -0.01);
    
    const newSettlements: Settlement[] = [];
    
    // Create a copy of balances for settlement calculation
    const workingBalances = { ...balances };
    
    creditors.forEach(([creditor, creditAmount]) => {
      let remainingCredit = creditAmount;
      
      debtors.forEach(([debtor, debtAmount]) => {
        if (remainingCredit > 0.01 && workingBalances[debtor] < -0.01) {
          const settlementAmount = Math.min(remainingCredit, Math.abs(workingBalances[debtor]));
          if (settlementAmount > 0.01) {
            newSettlements.push({
              from: debtor,
              to: creditor,
              amount: settlementAmount
            });
            remainingCredit -= settlementAmount;
            workingBalances[debtor] += settlementAmount;
          }
        }
      });
    });
    
    setSettlements(newSettlements);
    setShowResults(true);
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const regularExpenses = expenses.filter(e => e.type === 'regular');
  const foodExpenses = expenses.filter(e => e.type === 'food');
  const totalRegularExpenses = regularExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalFoodExpenses = foodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const perPersonRegularShare = totalPeople > 0 ? totalRegularExpenses / totalPeople : 0;

  const getTotalFoodOrdersAmount = () => {
    return Object.values(foodOrders).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Travel Expense Manager</h1>
          <p className="text-gray-600">Split expenses fairly among travelers with individual food tracking</p>
        </div>

        {/* Setup Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Trip Setup
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Number of Travelers
              </label>
              <input
                type="number"
                value={totalPeople}
                onChange={(e) => setTotalPeople(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter number of people"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                People Who Paid Expenses
              </label>
              <div className="space-y-2">
                {payers.map((payer, index) => (
                  <input
                    key={index}
                    type="text"
                    value={payer}
                    onChange={(e) => updatePayerName(index, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={`Person ${index + 1} name`}
                  />
                ))}
                {payers.length < totalPeople && (
                  <button
                    onClick={addPayer}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Expense Section */}
        {payers.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-green-600" />
              Add Expense
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g., Hotel, Food, Transport"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid By
                </label>
                <select
                  value={newExpense.paidBy}
                  onChange={(e) => setNewExpense({...newExpense, paidBy: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="">Select payer</option>
                  {payers.map((payer, index) => (
                    <option key={index} value={payer}>{payer}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Type
                </label>
                <select
                  value={newExpense.type}
                  onChange={(e) => setNewExpense({...newExpense, type: e.target.value as 'regular' | 'food'})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="regular">Regular (Split Equally)</option>
                  <option value="food">Food (Individual Orders)</option>
                </select>
              </div>
            </div>

            {/* Food Orders Section */}
            {newExpense.type === 'food' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5" />
                  Individual Food Orders
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allPeople.map((person, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 min-w-0 flex-1">
                        {person}:
                      </label>
                      <input
                        type="number"
                        value={foodOrders[person] || ''}
                        onChange={(e) => updateFoodOrder(person, e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-white rounded-lg border border-orange-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-semibold text-gray-800">${getTotalFoodOrdersAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Expense Amount:</span>
                    <span className="font-semibold text-gray-800">${(parseFloat(newExpense.amount) || 0).toFixed(2)}</span>
                  </div>
                  {Math.abs(getTotalFoodOrdersAmount() - (parseFloat(newExpense.amount) || 0)) > 0.01 && (
                    <div className="mt-2 text-sm text-red-600">
                      ⚠️ Orders total doesn't match expense amount
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={addExpense}
              className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        )}

        {/* Expenses List */}
        {expenses.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Expense List</h2>
            
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 bg-white/50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {expense.type === 'food' ? (
                            <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                          ) : (
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{expense.description}</p>
                            <p className="text-sm text-gray-600">
                              Paid by {expense.paidBy} • {expense.type === 'food' ? 'Individual Orders' : 'Split Equally'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-auto">
                          <p className="text-xl font-bold text-gray-800">${expense.amount.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {expense.type === 'food' && expense.foodOrders && (
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-sm font-medium text-orange-800 mb-2">Individual Orders:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                            {Object.entries(expense.foodOrders).map(([person, amount]) => (
                              <div key={person} className="flex justify-between">
                                <span className="text-gray-600">{person}:</span>
                                <span className="font-medium">${amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setEditingExpense(expense.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-lg font-semibold text-blue-800">Total Expenses: ${totalExpenses.toFixed(2)}</p>
                  <p className="text-sm text-blue-600">Regular expenses: ${totalRegularExpenses.toFixed(2)}</p>
                  <p className="text-sm text-blue-600">Food expenses: ${totalFoodExpenses.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">Per person (regular only): ${perPersonRegularShare.toFixed(2)}</p>
                  <button
                    onClick={calculateSettlements}
                    className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculate Settlements
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {showResults && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Settlement Results</h2>
            
            {settlements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-green-600 text-lg font-medium">🎉 All expenses are already settled!</p>
                <p className="text-gray-600 mt-2">Everyone has paid their fair share.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlements.map((settlement, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-green-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-bold">{settlement.from.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          <span className="text-red-600">{settlement.from}</span> owes{' '}
                          <span className="text-green-600">{settlement.to}</span>
                        </p>
                        <p className="text-sm text-gray-600">Settlement amount</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">${settlement.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;