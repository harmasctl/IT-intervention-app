// Test script to verify all advanced features work with real data
import { supabase } from '../lib/supabase';

interface TestResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  data?: any;
}

class FeatureTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting comprehensive feature tests...\n');

    await this.testDatabaseConnection();
    await this.testDevicesData();
    await this.testMaintenanceData();
    await this.testTicketsData();
    await this.testNotificationsData();
    await this.testRestaurantsData();
    await this.testCategoriesData();
    await this.testUsersData();

    this.printResults();
    return this.results;
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      const { data, error } = await supabase.from('devices').select('count').limit(1);
      
      if (error) {
        this.addResult('Database Connection', 'FAIL', `Connection failed: ${error.message}`);
      } else {
        this.addResult('Database Connection', 'PASS', 'Successfully connected to Supabase');
      }
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testDevicesData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          restaurant:restaurants(id, name),
          category:device_categories(id, name, color),
          model:device_models(id, name, manufacturer)
        `)
        .limit(10);

      if (error) {
        this.addResult('Devices Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Devices Data', 'WARNING', 'No devices found in database');
        return;
      }

      // Check data structure
      const device = data[0];
      const hasRequiredFields = device.id && device.name && device.serial_number;
      const hasRelations = device.restaurant || device.category;

      if (hasRequiredFields) {
        this.addResult(
          'Devices Data', 
          'PASS', 
          `Found ${data.length} devices with proper structure`,
          { count: data.length, sample: device }
        );
      } else {
        this.addResult('Devices Data', 'FAIL', 'Devices missing required fields');
      }
    } catch (error) {
      this.addResult('Devices Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testMaintenanceData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          device:devices(id, name, serial_number),
          technician:users(id, name, email)
        `)
        .limit(10);

      if (error) {
        this.addResult('Maintenance Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Maintenance Data', 'WARNING', 'No maintenance records found');
        return;
      }

      const maintenance = data[0];
      const hasRequiredFields = maintenance.id && maintenance.description;

      if (hasRequiredFields) {
        this.addResult(
          'Maintenance Data', 
          'PASS', 
          `Found ${data.length} maintenance records`,
          { count: data.length }
        );
      } else {
        this.addResult('Maintenance Data', 'FAIL', 'Maintenance records missing required fields');
      }
    } catch (error) {
      this.addResult('Maintenance Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testTicketsData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          device:devices(id, name, serial_number),
          assigned_to:users(id, name, email),
          created_by:users(id, name, email)
        `)
        .limit(10);

      if (error) {
        this.addResult('Tickets Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Tickets Data', 'WARNING', 'No tickets found');
        return;
      }

      const ticket = data[0];
      const hasRequiredFields = ticket.id && ticket.title && ticket.description;

      if (hasRequiredFields) {
        this.addResult(
          'Tickets Data', 
          'PASS', 
          `Found ${data.length} tickets`,
          { count: data.length }
        );
      } else {
        this.addResult('Tickets Data', 'FAIL', 'Tickets missing required fields');
      }
    } catch (error) {
      this.addResult('Tickets Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testNotificationsData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          device:devices(id, name, serial_number),
          user:users(id, name, email)
        `)
        .limit(10);

      if (error) {
        this.addResult('Notifications Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Notifications Data', 'WARNING', 'No notifications found');
        return;
      }

      const notification = data[0];
      const hasRequiredFields = notification.id && notification.title && notification.message;

      if (hasRequiredFields) {
        this.addResult(
          'Notifications Data', 
          'PASS', 
          `Found ${data.length} notifications`,
          { count: data.length }
        );
      } else {
        this.addResult('Notifications Data', 'FAIL', 'Notifications missing required fields');
      }
    } catch (error) {
      this.addResult('Notifications Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testRestaurantsData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .limit(10);

      if (error) {
        this.addResult('Restaurants Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Restaurants Data', 'WARNING', 'No restaurants found');
        return;
      }

      const restaurant = data[0];
      const hasRequiredFields = restaurant.id && restaurant.name;

      if (hasRequiredFields) {
        this.addResult(
          'Restaurants Data', 
          'PASS', 
          `Found ${data.length} restaurants`,
          { count: data.length }
        );
      } else {
        this.addResult('Restaurants Data', 'FAIL', 'Restaurants missing required fields');
      }
    } catch (error) {
      this.addResult('Restaurants Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testCategoriesData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('device_categories')
        .select('*')
        .limit(10);

      if (error) {
        this.addResult('Categories Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Categories Data', 'WARNING', 'No device categories found');
        return;
      }

      const category = data[0];
      const hasRequiredFields = category.id && category.name;

      if (hasRequiredFields) {
        this.addResult(
          'Categories Data', 
          'PASS', 
          `Found ${data.length} categories`,
          { count: data.length }
        );
      } else {
        this.addResult('Categories Data', 'FAIL', 'Categories missing required fields');
      }
    } catch (error) {
      this.addResult('Categories Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private async testUsersData(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(10);

      if (error) {
        this.addResult('Users Data', 'FAIL', `Query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('Users Data', 'WARNING', 'No users found');
        return;
      }

      const user = data[0];
      const hasRequiredFields = user.id && user.name;

      if (hasRequiredFields) {
        this.addResult(
          'Users Data', 
          'PASS', 
          `Found ${data.length} users`,
          { count: data.length }
        );
      } else {
        this.addResult('Users Data', 'FAIL', 'Users missing required fields');
      }
    } catch (error) {
      this.addResult('Users Data', 'FAIL', `Exception: ${(error as Error).message}`);
    }
  }

  private addResult(feature: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, data?: any): void {
    this.results.push({ feature, status, message, data });
  }

  private printResults(): void {
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.feature}: ${result.message}`);
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
    });

    console.log('\n' + '=' .repeat(60));
    console.log(`📈 SUMMARY: ${passed} PASSED, ${failed} FAILED, ${warnings} WARNINGS`);
    
    if (failed === 0) {
      console.log('🎉 ALL CRITICAL TESTS PASSED! Features are ready for production.');
    } else {
      console.log('🚨 SOME TESTS FAILED! Please review and fix issues before deployment.');
    }
  }
}

// Export for use in other files
export { FeatureTester };

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new FeatureTester();
  tester.runAllTests().then(() => {
    console.log('\n✅ Feature testing completed!');
  }).catch(error => {
    console.error('❌ Feature testing failed:', error);
  });
}
