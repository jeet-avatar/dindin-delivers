import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import billing
import references


class ReferenceAccessTests(unittest.TestCase):
    def test_feature_matrix(self):
        for source, tier, ref, hq in [('subscription','starter',False,False),('legacy','starter',False,False),('subscription','pro',True,False),('subscription','studio',True,True),('comp','studio',True,True),('trial','trial',True,False),('none','studio',False,False),('subscription','mixmind',False,False)]:
            with self.subTest(source=source,tier=tier):
                self.assertEqual(billing.reference_features({'source':source,'tier':tier}), {'references':ref,'cloud_hq':hq})

    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        p=patch.object(references,'ROOT',Path(temp.name));p.start();self.addCleanup(p.stop)
        self.user={'id':123,'subscription_status':'active','included_tracks':80,'included_cloud':20,'plan':'starter','plan_tier':'starter'}
        self.bridge=Mock();app=FastAPI();app.include_router(references.router_for(lambda:self.user,lambda:self.user,self.bridge));self.client=TestClient(app)

    def test_starter_cannot_start_reference_work_even_with_metering_off(self):
        with patch.dict('os.environ',{'BILLING_ENFORCED':'false'}):
            response=self.client.post('/api/references/local');self.assertEqual(response.status_code,403)
            self.assertIn('Pro or Studio',response.json()['detail'])
        self.bridge.assert_not_called()

    def test_pro_cannot_upload_or_start_cloud_with_credits(self):
        self.user.update(plan='pro_mixmind',plan_tier='pro')
        with patch.object(references.cloud_separation,'submit') as submit,patch.object(references.cloud_separation,'upload_form') as form:
            for endpoint,body in [('/cloud',{'name':'song.wav','bytes':100,'rights':True}),('/'+'a'*32+'/cloud-start',{})]:
                response=self.client.post('/api/references'+endpoint,json=body);self.assertEqual(response.status_code,403)
                self.assertIn('Studio',response.json()['detail'])
            submit.assert_not_called();form.assert_not_called()

    def test_listing_cloud_availability_follows_plan(self):
        with patch.object(references.cloud_separation,'available',return_value=True):
            for tier,allowed in [('starter',False),('pro',False),('studio',True)]:
                self.user.update(plan=tier,plan_tier=tier);response=self.client.get('/api/references');self.assertEqual(response.status_code,200)
                self.assertEqual(response.json()['cloud_separation']['available'],allowed)
                self.assertEqual(response.json()['features']['cloud_hq'],allowed)

    def test_studio_cloud_request_reaches_normal_validation(self):
        self.user.update(plan='studio',plan_tier='studio')
        with patch.object(references.cloud_separation,'available',return_value=True):
            response=self.client.post('/api/references/cloud',json={'name':'song.wav','bytes':100,'rights':False})
            self.assertEqual(response.status_code,400);self.assertIn('permission',response.json()['detail'])
